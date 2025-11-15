import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface SavedSchedule {
  id: string;
  name: string;
  type: "weekly" | "oddeven";
  createdAt: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("savedSchedules");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSchedules(parsed);
    }

    const active = localStorage.getItem("activeScheduleId");
    setActiveScheduleId(active);
  }, []);

  const handleSelectSchedule = (id: string) => {
    setActiveScheduleId(id);
    localStorage.setItem("activeScheduleId", id);
    navigate("/schedule");
  };

  const handleCreateNew = () => {
    navigate("/schedule-type");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-md mx-auto p-6 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">ClassPulse</h1>
          <p className="text-muted-foreground">Dina scheman</p>
        </div>

        <div className="space-y-3 mb-6">
          {schedules.length > 0 ? (
            schedules.map((schedule) => (
              <button
                key={schedule.id}
                onClick={() => handleSelectSchedule(schedule.id)}
                className={`w-full p-5 rounded-2xl text-left transition-all ${
                  activeScheduleId === schedule.id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card hover:bg-muted border border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{schedule.name}</h3>
                    <p className="text-sm opacity-80">
                      {schedule.type === "weekly" ? "Veckoschema" : "Udda/jämna veckor"}
                    </p>
                  </div>
                  {activeScheduleId === schedule.id && (
                    <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 px-6 rounded-2xl bg-card border border-border">
              <p className="text-muted-foreground mb-4">Inget schema ännu</p>
              <p className="text-sm text-muted-foreground">
                Skapa ditt första schema för att komma igång
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleCreateNew}
          className="w-full h-14 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Skapa nytt schema
        </Button>
      </div>
    </div>
  );
};

export default Home;
