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
    setUploading(true);
    
    // Simulate processing with mock data
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const mockSchedule = {
      monday: [
        { id: "1", name: "Matematik", start: "08:00", end: "09:30", color: "math" },
        { id: "2", name: "Engelska", start: "10:00", end: "11:30", color: "english" },
      ],
      tuesday: [
        { id: "3", name: "Naturkunskap", start: "08:00", end: "09:30", color: "science" },
        { id: "4", name: "Historia", start: "10:00", end: "11:30", color: "history" },
      ],
      wednesday: [
        { id: "5", name: "Idrott", start: "08:00", end: "09:30", color: "pe" },
        { id: "6", name: "Matematik", start: "10:00", end: "11:30", color: "math" },
      ],
      thursday: [
        { id: "7", name: "Engelska", start: "08:00", end: "09:30", color: "english" },
        { id: "8", name: "Bild", start: "10:00", end: "11:30", color: "art" },
      ],
      friday: [
        { id: "9", name: "Naturkunskap", start: "08:00", end: "09:30", color: "science" },
        { id: "10", name: "Historia", start: "10:00", end: "11:30", color: "history" },
      ],
    };

    localStorage.setItem("schedule", JSON.stringify(mockSchedule));
    
    toast({
      title: "Schema skapat!",
      description: "Ditt schema har bearbetats",
    });
    
    navigate("/schedule");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-md mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/schedule-type")}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Ladda upp ditt schema
            </h1>
            <p className="text-muted-foreground">
              Ta en bild eller välj från din enhet
            </p>
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
