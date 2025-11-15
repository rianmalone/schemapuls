import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, CalendarDays, ArrowLeft } from "lucide-react";
import { useState } from "react";

const ScheduleType = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"weekly" | "oddeven" | null>(null);

  const handleContinue = () => {
    if (selected) {
      localStorage.setItem("scheduleType", selected);
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
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
                selected === "weekly"
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card hover:border-primary/50"
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
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
                selected === "oddeven"
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card hover:border-primary/50"
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
            disabled={!selected}
            className="w-full h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all mt-8"
            size="lg"
          >
            Fortsätt
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleType;
