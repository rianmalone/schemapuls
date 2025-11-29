import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, CalendarDays, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const ScheduleType = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selected, setSelected] = useState<"weekly" | "oddeven" | null>(null);
  const [scheduleCount, setScheduleCount] = useState(0);

  useEffect(() => {
    const savedSchedules = JSON.parse(localStorage.getItem("savedSchedules") || "[]");
    setScheduleCount(savedSchedules.length);
  }, []);

  const handleContinue = () => {
    if (scheduleCount >= 5) {
      toast({
        title: "Max 5 scheman",
        description: "Du kan bara ha 5 scheman. Ta bort ett schema först för att skapa ett nytt.",
        variant: "destructive",
      });
      return;
    }
    
    if (selected) {
      // Normalize to "odd-even" format for consistency with notification service
      const normalizedType = selected === "oddeven" ? "odd-even" : selected;
      localStorage.setItem("scheduleType", normalizedType);
      console.log('[ScheduleType] Set scheduleType to:', normalizedType);
      navigate("/upload");
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
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Hur ser ditt schema ut?
            </h1>
            <p className="text-muted-foreground">
              Välj det alternativ som passar ditt schema
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={() => setSelected("weekly")}
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left active:scale-95 ${
                selected === "weekly"
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selected === "weekly"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground mb-1">
                    Samma varje vecka
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Mitt schema är likadant varje vecka
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelected("oddeven")}
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left active:scale-95 ${
                selected === "oddeven"
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selected === "oddeven"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground mb-1">
                    Olika på udda/jämna veckor
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Mitt schema växlar mellan udda och jämna veckor
                  </p>
                </div>
              </div>
            </button>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!selected || scheduleCount >= 5}
            className="w-full h-14 text-lg rounded-2xl shadow-lg transition-all mt-8"
            size="lg"
          >
            {scheduleCount >= 5 ? "Max 5 scheman" : "Fortsätt"}
          </Button>
          {scheduleCount >= 5 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Ta bort ett schema först för att skapa ett nytt
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleType;
