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

  // Convert image URI to data URL (for Android - avoids large base64 in memory)
  const uriToDataUrl = async (uri: string): Promise<string> => {
    try {
      console.log('[Upload] Converting URI to data URL:', uri);
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('[Upload] Image blob size:', blob.size, 'bytes');
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          console.log('[Upload] ✅ URI converted to data URL, length:', dataUrl.length);
          resolve(dataUrl);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read image blob'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[Upload] Error converting URI to data URL:', error);
      throw error;
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

    // On native, use Uri on Android to avoid large base64 payloads, DataUrl on iOS
    const isAndroid = Capacitor.getPlatform() === 'android';
    const resultType = isAndroid ? CameraResultType.Uri : CameraResultType.DataUrl;

    try {
      // Check if plugins are available
      if (!CameraPlugin || typeof CameraPlugin.getPhoto !== 'function') {
        console.warn('[Upload] Camera plugin not available, falling back to file input');
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
          fileInput.click();
        }
        return;
      }

      console.log('[Upload] Opening camera/photo picker, resultType:', resultType, 'platform:', Capacitor.getPlatform());

      const image = await CameraPlugin.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: resultType,
        source: CameraSource.Prompt,
      });

      // Defensive checks: image might be null/undefined
      if (!image) {
        console.log('[Upload] No image returned (user may have cancelled)');
        return; // Silent return for cancellation
      }

      let imageDataUrl: string;

      if (isAndroid && image.webPath) {
        // Android: Convert URI to data URL via blob
        console.log('[Upload] Android: Converting webPath to data URL:', image.webPath);
        try {
          imageDataUrl = await uriToDataUrl(image.webPath);
        } catch (uriError) {
          console.error('[Upload] Failed to convert URI to data URL:', uriError);
          toast({
            title: "Kunde inte ladda bilden",
            description: "Bilden kunde inte laddas från enheten. Försök igen.",
            variant: "destructive",
          });
          return;
        }
      } else if (image.dataUrl) {
        // iOS: Use dataUrl directly
        console.log('[Upload] iOS: Using dataUrl directly, length:', image.dataUrl.length);
        imageDataUrl = image.dataUrl;
      } else {
        console.error('[Upload] Image returned but no webPath (Android) or dataUrl (iOS)');
        toast({
          title: "Kunde inte ladda bilden",
          description: "Bilden kunde inte laddas. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      if (!imageDataUrl || typeof imageDataUrl !== 'string' || imageDataUrl.trim() === '') {
        console.error('[Upload] Image data URL is empty or invalid');
        toast({
          title: "Kunde inte ladda bilden",
          description: "Bilden kunde inte laddas. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      // Process the image
      try {
        console.log('[Upload] Resizing image...');
        const resizedImage = await resizeImage(imageDataUrl);
        if (resizedImage && typeof resizedImage === 'string' && resizedImage.trim() !== '') {
          console.log('[Upload] ✅ Image processed successfully');
          setPreview(resizedImage);
        } else {
          console.error('[Upload] Resized image is invalid');
          toast({
            title: "Kunde inte behandla bilden",
            description: "Bilden kunde inte behandlas. Försök med en annan bild.",
            variant: "destructive",
          });
        }
      } catch (resizeError) {
        console.error('[Upload] Error resizing image:', resizeError);
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
        const isAndroid = Capacitor.getPlatform() === 'android';
        const fallbackResultType = isAndroid ? CameraResultType.Uri : CameraResultType.DataUrl;
        
        try {
          console.log('[Upload] Camera unavailable, falling back to photos, resultType:', fallbackResultType);
          const image = await CameraPlugin.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: fallbackResultType,
            source: CameraSource.Photos, // Fallback to photos only
          });

          if (isAndroid && image?.webPath) {
            // Android: Convert URI
            try {
              const imageDataUrl = await uriToDataUrl(image.webPath);
              const resizedImage = await resizeImage(imageDataUrl);
              if (resizedImage) {
                setPreview(resizedImage);
              }
            } catch (fallbackError) {
              console.error('[Upload] Error processing fallback image (Android):', fallbackError);
              toast({
                title: "Kunde inte behandla bilden",
                description: "Försök igen",
                variant: "destructive",
              });
            }
          } else if (image?.dataUrl) {
            // iOS: Use dataUrl directly
            try {
              const resizedImage = await resizeImage(image.dataUrl);
              if (resizedImage) {
                setPreview(resizedImage);
              }
            } catch (fallbackError) {
              console.error('[Upload] Error resizing fallback image (iOS):', fallbackError);
              toast({
                title: "Kunde inte behandla bilden",
                description: "Försök igen",
                variant: "destructive",
              });
            }
          }
        } catch (fallbackError) {
          console.error('[Upload] Fallback to photos also failed:', fallbackError);
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
    const DEBUG_MINIMAL_PAYLOAD = true;
    
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
      
      console.log('[Upload] ===== STARTING SCHEMA ANALYSIS =====');
      console.log('[Upload] Preview image length:', preview.length, 'characters');
      console.log('[Upload] Preview image size (approx):', Math.round((preview.length * 3) / 4 / 1024), 'KB');
      
      // DIAGNOSTICS: Check environment variables
      console.log('[Upload] ===== ENVIRONMENT DIAGNOSTICS =====');
      console.log('[Upload] Platform:', Capacitor.getPlatform());
      console.log('[Upload] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'DEFINED' : 'UNDEFINED', import.meta.env.VITE_SUPABASE_URL);
      console.log('[Upload] VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'DEFINED' : 'UNDEFINED', import.meta.env.VITE_SUPABASE_ANON_KEY ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'N/A');
      console.log('[Upload] VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'DEFINED (NOT USED FOR EDGE FUNCTIONS)' : 'UNDEFINED');
      console.log('[Upload] All VITE_ env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
      
      // DIAGNOSTICS: Check Supabase client configuration
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const edgeFunctionUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/analyze-schedule` : 'UNDEFINED';
      console.log('[Upload] Edge Function URL:', edgeFunctionUrl);
      
      // Try to access supabase client internals (if available)
      try {
        // @ts-ignore - accessing internal property for diagnostics
        const clientUrl = supabase?.supabaseUrl || (supabase as any)?._supabaseUrl || 'NOT ACCESSIBLE';
        console.log('[Upload] Supabase client internal URL:', clientUrl);
      } catch (e) {
        console.log('[Upload] Could not access Supabase client URL:', e);
      }
      
      // Test endpoint reachability (simple GET ping)
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (edgeFunctionUrl && edgeFunctionUrl !== 'UNDEFINED' && anonKey) {
        try {
          console.log('[Upload] ===== TESTING ENDPOINT REACHABILITY =====');
          console.log('[Upload] Test URL:', edgeFunctionUrl);
          console.log('[Upload] Test method: GET');
          console.log('[Upload] Test headers:', {
            'apikey': 'SET (using ANON_KEY)',
            'Authorization': 'SET (using ANON_KEY)'
          });
          
          const testResponse = await fetch(edgeFunctionUrl, {
            method: 'GET',
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('[Upload] Test response status:', testResponse.status);
          console.log('[Upload] Test response OK:', testResponse.ok);
          console.log('[Upload] Test response headers:');
          testResponse.headers.forEach((value, key) => {
            console.log(`[Upload]   ${key}: ${value}`);
          });
          
          // Check for CORS header
          const corsHeader = testResponse.headers.get('Access-Control-Allow-Origin');
          console.log('[Upload] CORS header (Access-Control-Allow-Origin):', corsHeader || 'MISSING');
          
          if (!corsHeader) {
            console.error('[Upload] 🚨 WARNING: CORS header missing in response!');
          }
        } catch (reachError) {
          console.error('[Upload] 🚨 Endpoint NOT reachable:', reachError);
          console.error('[Upload] Reachability error type:', reachError instanceof Error ? reachError.constructor.name : typeof reachError);
          console.error('[Upload] Reachability error message:', reachError instanceof Error ? reachError.message : String(reachError));
          console.error('[Upload] Reachability error stack:', reachError instanceof Error ? reachError.stack : 'N/A');
        }
      } else {
        console.error('[Upload] 🚨 Cannot test reachability - missing URL or ANON key');
        console.error('[Upload]   URL:', edgeFunctionUrl);
        console.error('[Upload]   ANON Key:', anonKey ? 'SET' : 'MISSING');
      }
      
      // Process single schedule - USING EXPLICIT FETCH WITH AUTHORIZATION HEADERS
      let data, error;
      try {
        console.log('[Upload] ===== CALLING EDGE FUNCTION (EXPLICIT FETCH) =====');
        console.log('[Upload] Function name: analyze-schedule');
        console.log('[Upload] Using explicit fetch() with ANON_KEY (required for Android)');
        
        if (!edgeFunctionUrl || edgeFunctionUrl === 'UNDEFINED' || !anonKey) {
          throw new Error(`Missing Supabase URL or ANON key. URL: ${edgeFunctionUrl ? 'OK' : 'MISSING'}, ANON Key: ${anonKey ? 'OK' : 'MISSING'}`);
        }
        
        const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        const payload = { imageBase64: DEBUG_MINIMAL_PAYLOAD ? testImage : preview };
        const payloadSize = JSON.stringify(payload).length;
        console.log('[Upload] Payload size:', payloadSize, 'bytes');
        console.log('[Upload] Payload size (KB):', Math.round(payloadSize / 1024), 'KB');
        
        const headers = {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        };
        
        console.log('[Upload] Request headers:', {
          'apikey': 'SET (using ANON_KEY)',
          'Authorization': 'SET (using ANON_KEY)',
          'Content-Type': 'application/json'
        });
        console.log('[Upload] Request URL:', edgeFunctionUrl);
        console.log('[Upload] Request method: POST');
        
        const startTime = Date.now();
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;
        
        console.log('[Upload] ===== EDGE FUNCTION RESPONSE =====');
        console.log('[Upload] Response time:', duration, 'ms');
        console.log('[Upload] Response status:', response.status);
        console.log('[Upload] Response OK:', response.ok);
        console.log('[Upload] Response headers:');
        response.headers.forEach((value, key) => {
          console.log(`[Upload]   ${key}: ${value}`);
        });
        
        // Check CORS header
        const corsHeader = response.headers.get('Access-Control-Allow-Origin');
        console.log('[Upload] CORS header (Access-Control-Allow-Origin):', corsHeader || 'MISSING');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Upload] 🚨 Response not OK');
          console.error('[Upload] Status:', response.status, response.statusText);
          console.error('[Upload] Error body:', errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          error = {
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            status: response.status
          };
          data = null;
        } else {
          const responseText = await response.text();
          console.log('[Upload] Response body length:', responseText.length, 'characters');
          
          try {
            data = JSON.parse(responseText);
            console.log('[Upload] Response parsed successfully');
            console.log('[Upload] Response data keys:', Object.keys(data));
            error = null;
          } catch (parseError) {
            console.error('[Upload] 🚨 Failed to parse response JSON:', parseError);
            error = {
              message: 'Invalid JSON response from server',
              details: parseError instanceof Error ? parseError.message : String(parseError)
            };
            data = null;
          }
        }
      } catch (fetchError) {
        console.error('[Upload] 🚨 CRITICAL: Failed to fetch Edge Function:', fetchError);
        console.error('[Upload] Fetch error type:', fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError);
        console.error('[Upload] Fetch error message:', fetchError instanceof Error ? fetchError.message : String(fetchError));
        console.error('[Upload] Fetch error stack:', fetchError instanceof Error ? fetchError.stack : 'N/A');
        throw new Error(`Kunde inte ansluta till servern: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }

      if (error) {
        console.error('[Upload] 🚨 Function returned error:', error);
        console.error('[Upload] Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Kunde inte ansluta till servern');
      }

      if (!data) {
        console.error('[Upload] 🚨 Function returned no data');
        throw new Error('Ingen data returnerades från servern');
      }

      if (data?.error) {
        console.error('[Upload] 🚨 Analysis error in response:', data.error);
        console.error('[Upload] Error message:', data.message);
        throw new Error(data.message || 'Kunde inte analysera schemat');
      }

      console.log('[Upload] ✅ Analysis succeeded, schedule data received');
      
      if (!data.schedule) {
        console.error('[Upload] 🚨 No schedule in response data:', data);
        throw new Error('Inget schema returnerades från analysen');
      }
      
      const savedSchedule = data.schedule;
      console.log('[Upload] Schedule data:', Object.keys(savedSchedule).length, 'days');
      
      localStorage.setItem(`schedule_${scheduleId}`, JSON.stringify(savedSchedule));
      localStorage.setItem("activeScheduleId", scheduleId);
      localStorage.setItem("currentlyViewingScheduleId", scheduleId);
      localStorage.setItem("scheduleType", "weekly");
      console.log('[Upload] ✅ Schedule saved to localStorage');
      
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
      
      console.log('[Upload] ===== SCHEMA ANALYSIS COMPLETE =====');
      navigate("/schedule");
    } catch (error) {
      console.error('[Upload] ===== SCHEMA ANALYSIS FAILED =====');
      console.error('[Upload] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[Upload] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[Upload] Full error:', error);
      
      // Clear preview image so user can upload new ones
      setPreview(null);
      
      // Reset file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        if (input instanceof HTMLInputElement) {
          input.value = '';
        }
      });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Kunde inte analysera bilden",
        description: errorMessage || "Försök igen med en tydligare bild av schemat. Se till att hela schemat syns och är läsbart.",
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