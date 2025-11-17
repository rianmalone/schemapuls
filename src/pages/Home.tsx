import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Check, Trash2, Edit2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

  const handleSetActive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveScheduleId(id);
    localStorage.setItem("activeScheduleId", id);
  };

  const handleDeleteSchedule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    localStorage.setItem("savedSchedules", JSON.stringify(updated));
    if (activeScheduleId === id) {
      setActiveScheduleId(null);
      localStorage.removeItem("activeScheduleId");
    }
  };

  const handleStartEdit = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = (id: string) => {
    const updated = schedules.map(s => 
      s.id === id ? { ...s, name: editingName } : s
    );
    setSchedules(updated);
    localStorage.setItem("savedSchedules", JSON.stringify(updated));
    setEditingId(null);
  };

  const handleCreateNew = () => {
    navigate("/schedule-type");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-md mx-auto p-6 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">SchemaPuls</h1>
          <p className="text-muted-foreground">Dina scheman</p>
        </div>

        <div className="space-y-3 mb-6">
          {schedules.length > 0 ? (
            schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="w-full p-5 rounded-2xl bg-card border border-border transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleSelectSchedule(schedule.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {editingId === schedule.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleSaveEdit(schedule.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(schedule.id)}
                          className="font-semibold text-lg"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <h3 className="font-semibold text-lg">{schedule.name}</h3>
                          {activeScheduleId === schedule.id && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                              Aktiv
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(schedule.createdAt).toLocaleDateString("sv-SE")}
                    </p>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleStartEdit(schedule.id, schedule.name, e)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    
                    <button
                      onClick={(e) => handleSetActive(schedule.id, e)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        activeScheduleId === schedule.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground hover:border-primary"
                      }`}
                    >
                      {activeScheduleId === schedule.id && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
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
