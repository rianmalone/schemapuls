import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, ArrowLeft, Camera } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
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
      // Call the AI edge function to analyze the schedule
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: preview
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
        type: localStorage.getItem("scheduleType") || "weekly",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("savedSchedules", JSON.stringify(savedSchedules));
      
      toast({
        title: "Schema skapat!",
        description: "Ditt schema har analyserats med AI",
      });
      
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

          <div className="pt-4">
            <label
              htmlFor="file-upload"
              className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                preview
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-3xl"
                />
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-card-foreground">
                      Klicka för att ladda upp
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PNG, JPG eller PDF
                    </p>
                  </div>
                </div>
              )}
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {preview && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20">
                <p className="text-sm text-accent-foreground">
                  <strong>Tips:</strong> Vi analyserar ditt schema och skapar det
                  automatiskt. Du kan redigera allt efteråt!
                </p>
              </div>

              <Button
                onClick={handleProcess}
                disabled={uploading}
                className="w-full h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                {uploading ? (
                  <>
                    <UploadIcon className="w-5 h-5 mr-2 animate-pulse" />
                    Bearbetar...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-5 h-5 mr-2" />
                    Skapa schema
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
