import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, ArrowLeft, Camera } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewOdd, setPreviewOdd] = useState<string | null>(null);
  const [previewEven, setPreviewEven] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewOdd(e.target?.result as string);
    };
    reader.readAsDataURL(file);
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
      // For odd-even schedules, process both images
      if (scheduleType === "odd-even") {
        // Process odd week
        const responseOdd = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: previewOdd
          }),
        });

        if (!responseOdd.ok) {
          throw new Error('Failed to analyze odd week schedule');
        }

        const { schedule: scheduleOdd } = await responseOdd.json();

        // Process even week
        const responseEven = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: previewEven
          }),
        });

        if (!responseEven.ok) {
          throw new Error('Failed to analyze even week schedule');
        }

        const { schedule: scheduleEven } = await responseEven.json();

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
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: previewOdd
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze schedule');
        }

        const { schedule } = await response.json();

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
      toast({
        title: "Fel",
        description: "Kunde inte analysera schemat. Försök igen.",
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPreviewEven(reader.result as string);
                          };
                          reader.readAsDataURL(file);
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
