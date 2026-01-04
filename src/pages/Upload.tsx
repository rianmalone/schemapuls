import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, ArrowLeft, Camera } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";
import exampleSchedule from "@/assets/example-schedule.png";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Camera as CameraPlugin, CameraResultType, CameraSource } from "@capacitor/camera";

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const resizeImage = (file: File | string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Resize to max 2048px on longest side for better AI analysis while maintaining aspect ratio
        const maxDimension = 2048;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to PNG for full quality (no compression artifacts)
        const resizedDataUrl = canvas.toDataURL('image/png');
        
        console.log(`Image converted to PNG, dimensions: ${width}x${height}`);
        
        resolve(resizedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (typeof file === 'string') {
        // Already a data URL
        img.src = file;
      } else {
        // File object - need to read it first
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Bilden är för stor",
        description: "Vänligen välj en bild mindre än 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Fel filtyp",
        description: "Vänligen ladda upp en bild",
        variant: "destructive",
      });
      return;
    }

    try {
      const resizedImage = await resizeImage(file);
      setPreview(resizedImage);
    } catch (error) {
      console.error('Error resizing image:', error);
      toast({
        title: "Kunde inte behandla bilden",
        description: "Försök med en annan bild",
        variant: "destructive",
      });
    }
  };

  const handleImageClick = async () => {
    if (!Capacitor.isNativePlatform()) {
      // On web, trigger file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) {
        fileInput.click();
      }
      return;
    }

    // On native, show modern iOS action sheet with Camera and Photo Library options
    // Defensive error handling for iPad, permissions, cancellations, etc.
    try {
      // Check if plugins are available
      if (!CameraPlugin || typeof CameraPlugin.getPhoto !== 'function') {
        console.warn('Camera plugin not available, falling back to file input');
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
          fileInput.click();
        }
        return;
      }

      // Use native iOS action sheet via CameraSource.Prompt
      // This automatically shows the modern iOS style action sheet with Camera and Photo Library
      // No need for ActionSheet plugin - CameraSource.Prompt handles it natively

      const image = await CameraPlugin.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // Native iOS action sheet (modern style on iOS 13+)
      });

      // Defensive checks: image might be null/undefined, dataUrl might be missing
      if (!image) {
        console.log('No image returned (user may have cancelled)');
        return; // Silent return for cancellation
      }

      if (!image.dataUrl || typeof image.dataUrl !== 'string' || image.dataUrl.trim() === '') {
        console.warn('Image returned but dataUrl is missing or empty');
        toast({
          title: "Kunde inte ladda bilden",
          description: "Bilden kunde inte laddas. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      // Process the image
      try {
        const resizedImage = await resizeImage(image.dataUrl);
        if (resizedImage && typeof resizedImage === 'string' && resizedImage.trim() !== '') {
          setPreview(resizedImage);
        } else {
          console.warn('Resized image is invalid');
          toast({
            title: "Kunde inte behandla bilden",
            description: "Bilden kunde inte behandlas. Försök med en annan bild.",
            variant: "destructive",
          });
        }
      } catch (resizeError) {
        console.error('Error resizing image:', resizeError);
        toast({
          title: "Kunde inte behandla bilden",
          description: "Bilden kunde inte behandlas. Försök med en annan bild.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Comprehensive error handling for all failure modes
      console.error('Error getting image:', error);

      // Extract error message safely
      const errorMessage = error?.message || error?.toString() || '';
      const errorCode = error?.code || '';
      const errorString = String(errorMessage).toLowerCase();

      // Handle user cancellation - silent return, no error shown
      if (
        errorString.includes('cancel') ||
        errorString.includes('cancelled') ||
        errorString.includes('canceled') ||
        errorString.includes('user cancelled') ||
        errorString.includes('user canceled') ||
        errorCode === 'USER_CANCELLED' ||
        errorCode === 'USER_CANCELED'
      ) {
        console.log('User cancelled image selection');
        return; // Silent return - user cancelled, don't show error
      }

      // Handle permission denied errors
      if (
        errorString.includes('permission') ||
        errorString.includes('not authorized') ||
        errorString.includes('access denied') ||
        errorCode === 'PERMISSION_DENIED' ||
        errorCode === 'NOT_AUTHORIZED'
      ) {
        toast({
          title: "Behörighet saknas",
          description: "Appen behöver behörighet för kameran och bilder. Gå till Inställningar för att ge behörighet.",
          variant: "destructive",
        });
        return;
      }

      // Handle camera not available (e.g., iPad without camera)
      if (
        errorString.includes('camera not available') ||
        errorString.includes('no camera') ||
        errorString.includes('camera unavailable') ||
        errorCode === 'CAMERA_UNAVAILABLE'
      ) {
        // Fall back to photo library only
        try {
          const image = await CameraPlugin.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Photos, // Fallback to photos only
          });

          if (image?.dataUrl) {
            try {
              const resizedImage = await resizeImage(image.dataUrl);
              if (resizedImage) {
                setPreview(resizedImage);
              }
            } catch (resizeError) {
              console.error('Error resizing fallback image:', resizeError);
              toast({
                title: "Kunde inte behandla bilden",
                description: "Försök igen",
                variant: "destructive",
              });
            }
          }
        } catch (fallbackError) {
          console.error('Fallback to photos also failed:', fallbackError);
          toast({
            title: "Kunde inte öppna bildväljaren",
            description: "Kameran är inte tillgänglig. Försök välja en bild från galleriet.",
            variant: "destructive",
          });
        }
        return;
      }

      // Generic error handling - show user-friendly message
      toast({
        title: "Kunde inte öppna bildväljaren",
        description: "Ett oväntat fel uppstod. Försök igen eller välj en bild från filer.",
        variant: "destructive",
      });
    }
  };

  const handleProcess = async () => {
    if (!preview) {
      toast({
        title: "Ingen bild",
        description: "Ladda upp en bild först",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      const scheduleId = Date.now().toString();
      
      // Process single schedule
      const { data, error } = await supabase.functions.invoke('analyze-schedule', {
        body: { imageBase64: preview }
      });

      if (error) {
        console.error('Error:', error);
        throw new Error(error.message || 'Kunde inte ansluta till servern');
      }

      if (data?.error) {
        throw new Error(data.message || 'Kunde inte analysera schemat');
      }
      
      const savedSchedule = data.schedule;
      
      localStorage.setItem(`schedule_${scheduleId}`, JSON.stringify(savedSchedule));
      localStorage.setItem("activeScheduleId", scheduleId);
      localStorage.setItem("currentlyViewingScheduleId", scheduleId);
      localStorage.setItem("scheduleType", "weekly");
      
      const savedSchedules = JSON.parse(localStorage.getItem("savedSchedules") || "[]");
      savedSchedules.push({
        id: scheduleId,
        name: `Schema ${savedSchedules.length + 1}`,
        type: "weekly",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("savedSchedules", JSON.stringify(savedSchedules));
      
      toast({
        title: "Schema skapat!",
        description: "Ditt schema har analyserats med AI",
      });

      // Schedule notifications if permission is granted
      const hasPermission = await notificationService.requestPermissions();
      if (hasPermission) {
        // Initialize all classes as enabled
        const allEnabledClasses: Record<string, boolean> = {};
        Object.values(savedSchedule).forEach((dayClasses: any) => {
          if (Array.isArray(dayClasses)) {
            dayClasses.forEach((classItem: any) => {
              if (classItem && classItem.id) {
                allEnabledClasses[classItem.id] = true;
              }
            });
          }
        });
        
        const allEnabledDays = {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
        };
        
        // Save enabled classes/days to per-schedule keys only
        localStorage.setItem(`enabledClasses_${scheduleId}`, JSON.stringify(allEnabledClasses));
        localStorage.setItem(`enabledDays_${scheduleId}`, JSON.stringify(allEnabledDays));
        
        const notificationMinutes = parseInt(localStorage.getItem("globalNotificationMinutes") || "5");
        
        await notificationService.scheduleNotifications(
          savedSchedule,
          allEnabledClasses,
          allEnabledDays,
          notificationMinutes,
          "weekly"
        );
      }
      
      navigate("/schedule");
    } catch (error) {
      console.error('Error analyzing schedule:', error);
      
      // Clear preview image so user can upload new ones
      setPreview(null);
      
      // Reset file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        if (input instanceof HTMLInputElement) {
          input.value = '';
        }
      });
      
      toast({
        title: "Kunde inte analysera bilden",
        description: "Försök igen med en tydligare bild av schemat. Se till att hela schemat syns och är läsbart.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-md mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              Ladda upp ditt schema
            </h1>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Tips för bästa resultat:</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Ta en tydlig skärmdump av HELA schemat</li>
                <li>Inkludera alla dagar och alla lektioner</li>
                <li>Se till att all text är läsbar och inte suddig</li>
                <li>Zooma in vid behov för bättre bildkvalitet</li>
                <li>Undvik reflektioner, skuggor och blockerade delar</li>
              </ul>
              
              <div className="mt-4 p-3 bg-card rounded-xl border border-border">
                <p className="text-xs font-medium text-foreground mb-2">Exempel på ett bra schema:</p>
                <img 
                  src={exampleSchedule} 
                  alt="Exempel på ett tydligt schema" 
                  className="w-full rounded-lg border border-border"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  ↑ Så här ska schemat se ut för bästa resultat
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <label
              htmlFor="file-upload"
              onClick={(e) => {
                if (Capacitor.isNativePlatform()) {
                  e.preventDefault();
                  handleImageClick();
                }
              }}
              className="block w-full p-8 border-2 border-dashed border-border rounded-2xl bg-card transition-colors cursor-pointer active:bg-accent"
            >
              <div className="flex flex-col items-center gap-3">
                {preview ? (
                  <>
                    <Camera className="w-12 h-12 text-primary" />
                    <img src={preview} alt="Preview" className="w-full rounded-lg" />
                    <span className="text-sm text-muted-foreground">
                      Klicka för att byta bild
                    </span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-12 h-12 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-foreground font-medium">
                        Ladda upp en bild
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Klicka eller dra en fil hit
                      </p>
                    </div>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <Button
            onClick={handleProcess}
            disabled={uploading || !preview}
            className="w-full py-6 text-lg rounded-xl"
            size="lg"
          >
            {uploading ? "Analyserar..." : "Skapa schema"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Upload;