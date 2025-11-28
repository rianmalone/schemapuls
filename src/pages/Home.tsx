import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Check, Trash2, Edit2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { DarkModeToggle } from "@/components/DarkModeToggle";

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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentWeekAndDay = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    
    const days = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
    const dayName = days[now.getDay()];
    const date = now.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
    
    return { weekNumber, dayName, date };
  };

  const getActiveWeekTypes = (scheduleId: string): string[] => {
    const enabledOdd = localStorage.getItem("enabledClassesOdd");
    const enabledEven = localStorage.getItem("enabledClassesEven");
    const activeTypes: string[] = [];

    if (enabledOdd) {
      const parsedOdd = JSON.parse(enabledOdd);
      if (Object.values(parsedOdd).some(enabled => enabled === true)) {
        activeTypes.push("Udda");
      }
    }

    if (enabledEven) {
      const parsedEven = JSON.parse(enabledEven);
      if (Object.values(parsedEven).some(enabled => enabled === true)) {
        activeTypes.push("Jämn");
      }
    }

    return activeTypes;
  };

  const loadSchedules = () => {
    const saved = localStorage.getItem("savedSchedules");
    console.log('Loading schedules from localStorage');
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Found saved schedules:', parsed.length);
        
        // Filter out schedules that have no data
        const validSchedules = parsed.filter((schedule: SavedSchedule) => {
          if (schedule.type === "oddeven") {
            const hasOdd = localStorage.getItem(`scheduleOdd_${schedule.id}`);
            const hasEven = localStorage.getItem(`scheduleEven_${schedule.id}`);
            const isValid = hasOdd && hasEven;
            if (!isValid) {
              console.log(`Schedule ${schedule.name} (${schedule.id}) is missing data`);
            }
            return isValid;
          } else {
            const hasData = !!localStorage.getItem(`schedule_${schedule.id}`);
            if (!hasData) {
              console.log(`Schedule ${schedule.name} (${schedule.id}) is missing data`);
            }
            return hasData;
          }
        });
        
        // If we filtered out broken schedules, update localStorage
        if (validSchedules.length !== parsed.length) {
          console.log(`Cleaned up ${parsed.length - validSchedules.length} broken schedules`);
          localStorage.setItem("savedSchedules", JSON.stringify(validSchedules));
        }
        
        console.log('Valid schedules:', validSchedules.length);
        setSchedules(validSchedules);
      } catch (error) {
        console.error('Error parsing savedSchedules:', error);
        localStorage.removeItem("savedSchedules");
        setSchedules([]);
      }
    } else {
      console.log('No saved schedules found');
      setSchedules([]);
    }

    const active = localStorage.getItem("activeScheduleId");
    setActiveScheduleId(active);
  };

  useEffect(() => {
    loadSchedules();
    
    // Reload schedules when window regains focus (e.g., switching tabs)
    const handleFocus = () => {
      console.log('Window focused, reloading schedules');
      loadSchedules();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleSelectSchedule = (id: string) => {
    console.log('handleSelectSchedule called with id:', id);
    // Find the selected schedule
    const selectedSchedule = schedules.find(s => s.id === id);
    if (!selectedSchedule) {
      console.log('Schedule not found in list');
      return;
    }
    
    console.log('Selected schedule:', selectedSchedule);

    // Load this schedule's data from localStorage
    if (selectedSchedule.type === "oddeven") {
      const scheduleOdd = localStorage.getItem(`scheduleOdd_${id}`);
      const scheduleEven = localStorage.getItem(`scheduleEven_${id}`);
      
      console.log('Loading oddeven schedule, odd:', !!scheduleOdd, 'even:', !!scheduleEven);
      
      if (scheduleOdd && scheduleEven) {
        localStorage.setItem("schedule", scheduleOdd);
        localStorage.setItem("scheduleOdd", scheduleOdd);
        localStorage.setItem("scheduleEven", scheduleEven);
        localStorage.setItem("scheduleType", "oddeven");
        console.log('Set oddeven data, navigating to /schedule');
        navigate("/schedule");
      } else {
        console.log('Missing oddeven schedule data for id:', id);
      }
    } else {
      const schedule = localStorage.getItem(`schedule_${id}`);
      
      console.log('Loading weekly schedule, exists:', !!schedule);
      
      if (schedule) {
        localStorage.setItem("schedule", schedule);
        localStorage.setItem("scheduleType", "weekly");
        console.log('Set weekly data, navigating to /schedule');
        navigate("/schedule");
      } else {
        console.log('Missing weekly schedule data for id:', id);
      }
    }
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
    
    // Also remove the schedule data
    localStorage.removeItem(`schedule_${id}`);
    localStorage.removeItem(`scheduleOdd_${id}`);
    localStorage.removeItem(`scheduleEven_${id}`);
    
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
    const trimmedName = editingName.trim();
    if (trimmedName.length === 0 || trimmedName.length > 13) {
      setEditingId(null);
      return;
    }
    const updated = schedules.map(s => 
      s.id === id ? { ...s, name: trimmedName } : s
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
      <div className="max-w-md mx-auto p-6 pt-12">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-1">SchemaPuls</h1>
            <p className="text-sm font-medium text-foreground/80 mb-2">
              {(() => {
                const { weekNumber, dayName, date } = getCurrentWeekAndDay();
                return `Vecka ${weekNumber} • ${dayName} • ${date}`;
              })()}
            </p>
            <p className="text-sm text-muted-foreground/70 mb-1 mt-4">Dina scheman:</p>
          </div>
          <div className="flex flex-col items-end gap-2 mt-3">
            <DarkModeToggle />
            <div className="text-right mt-2">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {currentTime.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-2">
          {schedules.length > 0 ? (
            <>
              {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="w-full p-4 rounded-2xl bg-card border border-border transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => editingId !== schedule.id && handleSelectSchedule(schedule.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {editingId === schedule.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 13) {
                              setEditingName(value);
                            }
                          }}
                          onBlur={() => handleSaveEdit(schedule.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(schedule.id)}
                          className="font-semibold text-lg"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          maxLength={13}
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
                    <div className="space-y-0.5 overflow-hidden transition-all duration-300">
                      <p className="text-xs text-muted-foreground">
                        {new Date(schedule.createdAt).toLocaleDateString("sv-SE")}
                      </p>
                      <div 
                        className={`overflow-hidden transition-all duration-300 ${
                          activeScheduleId === schedule.id && schedule.type === "oddeven" && getActiveWeekTypes(schedule.id).length > 0
                            ? "max-h-20 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground/70">
                          Aktuell: {getActiveWeekTypes(schedule.id).join(", ").toLowerCase()}
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-2 shrink-0">
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
            ))}
            <p className="text-xs text-muted-foreground/60 text-center mt-3 mb-2">Max 5 schemor</p>
          </>
          ) : (
            <div className="text-center py-12 px-6 rounded-2xl bg-card border border-border">
              <p className="text-muted-foreground mb-4">Inget schema ännu</p>
              <p className="text-sm text-muted-foreground">
                Skapa ditt första schema för att komma igång
              </p>
            </div>
          )}
        </div>

        <div className="mb-6 mt-4">
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
    </div>
  );
};

export default Home;
