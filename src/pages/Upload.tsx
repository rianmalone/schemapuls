import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, ArrowLeft, Camera } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";
import exampleSchedule from "@/assets/example-schedule.png";
import { supabase } from "@/integrations/supabase/client";

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewOdd, setPreviewOdd] = useState<string | null>(null);
  const [previewEven, setPreviewEven] = useState<string | null>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Resize to max 1024px on longest side while maintaining aspect ratio
          const maxDimension = 1024;
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

          // Convert to JPEG with quality adjustment for size limits
          let quality = 0.85; // Start with 85% for balance between quality and size
          let resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Check size - Supabase edge functions have ~2MB limit
          // Base64 is ~33% larger than binary, so keep under 1.5MB to be safe
          const sizeInBytes = (resizedDataUrl.length * 3) / 4;
          const sizeInMB = sizeInBytes / (1024 * 1024);
          
          console.log(`Image size: ${sizeInMB.toFixed(2)}MB at quality ${quality}`);
          
          // If too large, reduce quality
          while (sizeInMB > 1.5 && quality > 0.4) {
            quality -= 0.1;
            resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const newSize = (resizedDataUrl.length * 3) / 4 / (1024 * 1024);
            console.log(`Reduced quality to ${quality.toFixed(2)}, new size: ${newSize.toFixed(2)}MB`);
            if (newSize <= 1.5) break;
          }
          
          resolve(resizedDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
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
      setPreviewOdd(resizedImage);
    } catch (error) {
      console.error('Error resizing image:', error);
      toast({
        title: "Kunde inte behandla bilden",
        description: "Försök med en annan bild",
        variant: "destructive",
      });
    }
  };

  const handleProcess = async () => {
    const scheduleType = localStorage.getItem("scheduleType") || "weekly";
    
    if (scheduleType === "odd-even") {
      if (!previewOdd || !previewEven) {
        toast({
          title: "Saknas bilder",
          description: "Ladda upp både udda och jämna veckor",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!previewOdd) {
        toast({
          title: "Ingen bild",
          description: "Ladda upp en bild först",
          variant: "destructive",
        });
        return;
      }
    }

    setUploading(true);
    
    try {
      console.log('Starting schedule analysis...', { scheduleType, hasPreviewOdd: !!previewOdd, hasPreviewEven: !!previewEven });
      
      // For odd-even schedules, process both images
      if (scheduleType === "odd-even") {
        // Process odd week
        console.log('Calling analyze-schedule for odd week...');
        const { data: resultOdd, error: errorOdd } = await supabase.functions.invoke('analyze-schedule', {
          body: { imageBase64: previewOdd, imageLength: previewOdd?.length || 0 }
        });

        if (errorOdd) {
          throw new Error(`Odd week: ${errorOdd.message}`);
        }
        if (resultOdd?.error) {
          throw new Error(resultOdd?.message || 'Kunde inte analysera udda veckans schema');
        }

        const { schedule: scheduleOdd } = resultOdd;

        // Process even week
        console.log('Calling analyze-schedule for even week...');
        const { data: resultEven, error: errorEven } = await supabase.functions.invoke('analyze-schedule', {
          body: { imageBase64: previewEven, imageLength: previewEven?.length || 0 }
        });

        if (errorEven) {
          throw new Error(`Even week: ${errorEven.message}`);
        }
        if (resultEven?.error) {
          throw new Error(resultEven?.message || 'Kunde inte analysera jämna veckans schema');
        }

        const { schedule: scheduleEven } = resultEven;

        const scheduleId = Date.now().toString();
        localStorage.setItem("scheduleOdd", JSON.stringify(scheduleOdd));
        localStorage.setItem("scheduleEven", JSON.stringify(scheduleEven));
        localStorage.setItem("schedule", JSON.stringify(scheduleOdd)); // Default to odd
        localStorage.setItem("activeScheduleId", scheduleId);
        
        // Save to list of schedules
        const savedSchedules = JSON.parse(localStorage.getItem("savedSchedules") || "[]");
        savedSchedules.push({
          id: scheduleId,
          name: `Schema ${savedSchedules.length + 1}`,
          type: "odd-even",
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("savedSchedules", JSON.stringify(savedSchedules));
      } else {
        // Process single schedule
        console.log('Calling analyze-schedule for single week...');
        console.log('Image data URL length:', previewOdd?.length);
        
        // Use Supabase SDK - the preview environment routes this differently than direct fetch
        const { data: result, error } = await supabase.functions.invoke('analyze-schedule', {
          body: { 
            imageBase64: previewOdd,
            imageLength: previewOdd?.length || 0
          }
        });

        console.log('Single week result:', { result, error });

        if (error) {
          console.error('Supabase SDK error:', error);
          throw new Error(`Failed to call function: ${error.message}`);
        }

        if (result?.error) {
          console.error('Function returned error:', result);
          throw new Error(result?.message || 'Kunde inte analysera schemat');
        }

        const { schedule } = result;

        const scheduleId = Date.now().toString();
        localStorage.setItem("schedule", JSON.stringify(schedule));
        localStorage.setItem("activeScheduleId", scheduleId);
        
        // Save to list of schedules
        const savedSchedules = JSON.parse(localStorage.getItem("savedSchedules") || "[]");
        savedSchedules.push({
          id: scheduleId,
          name: `Schema ${savedSchedules.length + 1}`,
          type: scheduleType,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("savedSchedules", JSON.stringify(savedSchedules));
      }
      
      toast({
        title: "Schema skapat!",
        description: "Ditt schema har analyserats med AI",
      });

      // Schedule notifications if permission is granted
      const hasPermission = await notificationService.checkPermissions();
      if (hasPermission) {
        const schedule = JSON.parse(localStorage.getItem("schedule") || "{}");
        const enabledClasses = JSON.parse(localStorage.getItem("enabledClasses") || "{}");
        const enabledDays = JSON.parse(localStorage.getItem("enabledDays") || "{}");
        const notificationMinutes = parseInt(localStorage.getItem("globalNotificationMinutes") || "5");
        
        await notificationService.scheduleNotifications(
          schedule,
          enabledClasses,
          enabledDays,
          notificationMinutes,
          scheduleType
        );
      }
      
      navigate("/schedule");
    } catch (error) {
      console.error('Error analyzing schedule:', error);
      const errorMessage = error instanceof Error ? error.message : "Kunde inte analysera schemat. Försök igen och se till att hela schemat syns tydligt i bilden.";
      toast({
        title: "Något gick fel",
        description: errorMessage,
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
            {localStorage.getItem("scheduleType") === "odd-even" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-foreground text-center">Udda vecka</h3>
                  <label
                    htmlFor="file-upload-odd"
                    className="block w-full p-4 border-2 border-dashed border-border rounded-2xl bg-card hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {previewOdd ? (
                        <>
                          <Camera className="w-8 h-8 text-primary" />
                          <img src={previewOdd} alt="Preview Odd" className="w-full rounded-lg" />
                          <span className="text-[10px] text-muted-foreground text-center">
                            Klicka för att byta
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-8 h-8 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-foreground font-medium text-xs">
                              Ladda upp
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Klicka här
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      id="file-upload-odd"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                <div>
                  <h3 className="text-xs font-semibold mb-2 text-foreground text-center">Jämn vecka</h3>
                  <label
                    htmlFor="file-upload-even"
                    className="block w-full p-4 border-2 border-dashed border-border rounded-2xl bg-card hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {previewEven ? (
                        <>
                          <Camera className="w-8 h-8 text-primary" />
                          <img src={previewEven} alt="Preview Even" className="w-full rounded-lg" />
                          <span className="text-[10px] text-muted-foreground text-center">
                            Klicka för att byta
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-8 h-8 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-foreground font-medium text-xs">
                              Ladda upp
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Klicka här
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      id="file-upload-even"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={async (e) => {
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
                          setPreviewEven(resizedImage);
                        } catch (error) {
                          console.error('Error resizing image:', error);
                          toast({
                            title: "Kunde inte behandla bilden",
                            description: "Försök med en annan bild",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="block w-full p-8 border-2 border-dashed border-border rounded-2xl bg-card hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="flex flex-col items-center gap-3">
                  {previewOdd ? (
                    <>
                      <Camera className="w-12 h-12 text-primary" />
                      <img src={previewOdd} alt="Preview" className="w-full rounded-lg" />
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
                  capture="environment"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          <Button
            onClick={handleProcess}
            disabled={
              uploading || 
              (localStorage.getItem("scheduleType") === "odd-even" 
                ? (!previewOdd || !previewEven) 
                : !previewOdd)
            }
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
