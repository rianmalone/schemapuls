import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Check, Trash2, Edit2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { notificationService } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";

interface SavedSchedule {
  id: string;
  name: string;
  type: "weekly";
  createdAt: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const loadSchedules = () => {
    const saved = localStorage.getItem("savedSchedules");
    console.log('Loading schedules from localStorage');
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Found saved schedules:', parsed.length);
        
        // Filter out schedules that have no data
        const validSchedules = parsed.filter((schedule: SavedSchedule) => {
          const hasData = !!localStorage.getItem(`schedule_${schedule.id}`);
          if (!hasData) {
            console.log(`Schedule ${schedule.name} (${schedule.id}) is missing data`);
          }
          return hasData;
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
    const selectedSchedule = schedules.find(s => s.id === id);
    if (!selectedSchedule) {
      console.log('Schedule not found in list');
      return;
    }
    
    console.log('Selected schedule:', selectedSchedule);

    const schedule = localStorage.getItem(`schedule_${id}`);
    
    console.log('Loading weekly schedule, exists:', !!schedule);
    
    if (schedule) {
      localStorage.setItem("scheduleType", "weekly");
      localStorage.setItem("currentlyViewingScheduleId", id);
      console.log('Set weekly viewing metadata, navigating to /schedule');
      navigate("/schedule");
    } else {
      console.log('Missing weekly schedule data for id:', id);
    }
  };

  const handleSetActive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[Home] 🔄 ACTIVATING SCHEDULE:', id);
    
    const selectedSchedule = schedules.find(s => s.id === id);
    if (!selectedSchedule) {
      console.log('[Home] ❌ Schedule not found');
      return;
    }

    // Request permission BEFORE setting as active
    const hasPermission = await notificationService.requestPermissions();
    console.log('[Home] Permission result:', hasPermission);
    if (!hasPermission) {
      console.log('[Home] ❌ No permission, aborting');
      toast({
        title: "Behörighet krävs",
        description: "Du behöver ge behörighet för notiser för att aktivera schemat",
        variant: "destructive",
      });
      return;
    }

    // Cancel ALL existing notifications before scheduling new ones
    console.log('[Home] 🚫 CANCELLING all existing notifications');
    await notificationService.cancelAllNotifications();

    // Now set as active
    setActiveScheduleId(id);
    localStorage.setItem("activeScheduleId", id);

    // Load schedule data
    const data = localStorage.getItem(`schedule_${id}`);
    const scheduleData = data ? JSON.parse(data) : {};
    console.log('[Home] Loaded weekly schedule');

    // Build enabled classes from schedule data (default all enabled)
    let enabledClasses: Record<string, boolean> = {};
    Object.values(scheduleData).forEach((dayClasses: any) => {
      if (Array.isArray(dayClasses)) {
        dayClasses.forEach((classItem: any) => {
          if (classItem && classItem.id) {
            enabledClasses[classItem.id] = true;
          }
        });
      }
    });

    // Try to load saved enabled classes from per-schedule key only (NO global fallback)
    const savedEnabled = localStorage.getItem(`enabledClasses_${id}`);
    if (savedEnabled) {
      try {
        const saved = JSON.parse(savedEnabled);
        // Validate that saved IDs match current schedule
        const savedIds = new Set(Object.keys(saved));
        const currentIds = new Set(Object.keys(enabledClasses));
        if ([...currentIds].every(id => savedIds.has(id))) {
          enabledClasses = saved;
          console.log('[Home] Using saved enabled classes');
        } else {
          console.log('[Home] Saved enabled classes mismatch, using defaults');
        }
      } catch (err) {
        console.log('[Home] Error parsing saved enabled classes, using defaults');
      }
    }

    // Load enabled days from per-schedule key only (NO global fallback)
    const enabledDaysStr = localStorage.getItem(`enabledDays_${id}`);
    const enabledDays = enabledDaysStr 
      ? JSON.parse(enabledDaysStr) 
      : { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true };

    // Get notification minutes
    const notificationMinutes = parseInt(localStorage.getItem("notificationMinutes") || "5", 10);

    console.log('[Home] Scheduling notifications - minutes:', notificationMinutes);
    console.log('[Home] Enabled classes:', Object.keys(enabledClasses).length);
    console.log('[Home] Enabled days:', enabledDays);

    await notificationService.scheduleNotifications(
      scheduleData as any,
      enabledClasses,
      enabledDays,
      notificationMinutes,
      "weekly"
    );

    toast({
      title: "Schema aktiverat",
      description: `Påminnelser aktiverade för ${selectedSchedule.name}`,
    });
    
    console.log('[Home] ✅ Schedule activated:', selectedSchedule.name);
  };

  const handleDeleteSchedule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If not confirming this one, start confirmation
    if (confirmingDeleteId !== id) {
      // Clear any existing timeout
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      setConfirmingDeleteId(id);
      // Auto-reset after 3 seconds
      deleteTimeoutRef.current = setTimeout(() => {
        setConfirmingDeleteId(null);
      }, 3000);
      return;
    }
    
    // Confirmed - delete the schedule
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }
    setConfirmingDeleteId(null);
    
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    localStorage.setItem("savedSchedules", JSON.stringify(updated));
    
    // Also remove the schedule data
    localStorage.removeItem(`schedule_${id}`);
    
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
    navigate("/upload");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-md mx-auto p-6 pt-12">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[clamp(1.5rem,8vw,2.25rem)] font-bold text-foreground mb-1 leading-tight">SchemaPuls</h1>
            <p className="text-[clamp(0.7rem,3vw,0.875rem)] font-medium text-foreground/80 mb-2">
              {(() => {
                const { weekNumber, dayName, date } = getCurrentWeekAndDay();
                return `Vecka ${weekNumber} • ${dayName} • ${date}`;
              })()}
            </p>
            <p className="text-[clamp(0.7rem,3vw,0.875rem)] text-muted-foreground/70 mb-1 mt-4">Dina scheman:</p>
          </div>
          <div className="flex flex-col items-end gap-2 mt-1 shrink-0">
            <DarkModeToggle />
            <div className="text-right mt-1">
              <div className="text-[clamp(1rem,5vw,1.5rem)] font-bold text-foreground tabular-nums">
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
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleStartEdit(schedule.id, schedule.name, e)}
                      className="p-2 rounded-lg transition-colors active:bg-muted"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    
                    <button
                      onClick={(e) => handleSetActive(schedule.id, e)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        activeScheduleId === schedule.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {activeScheduleId === schedule.id && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                      className="p-2 rounded-lg transition-colors active:bg-destructive/10"
                    >
                      {confirmingDeleteId === schedule.id ? (
                        <Check className="w-4 h-4 text-destructive" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </>
          ) : (
            <div className="text-center py-8 px-6 rounded-2xl bg-card border border-border mb-6">
              <p className="text-muted-foreground text-sm">
                Du har inga scheman än. Skapa ett nytt schema för att komma igång!
              </p>
            </div>
          )}
        </div>
        
        <Button 
          onClick={handleCreateNew}
          className="w-full h-14 text-lg rounded-2xl shadow-lg transition-all mt-4"
          size="lg"
          disabled={schedules.length >= 5}
        >
          <Plus className="w-5 h-5 mr-2" />
          {schedules.length >= 5 ? "Max 5 scheman" : "Skapa nytt schema"}
        </Button>
        
        {schedules.length >= 5 && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Ta bort ett schema först för att skapa ett nytt
          </p>
        )}
        
        {/* Privacy Policy Link */}
        <div className="mt-6 text-center">
          <a 
            href="https://schemapuls.se/sekretesspolicy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:text-blue-600 active:text-blue-700 transition-colors underline"
          >
            Sekretesspolicy
          </a>
        </div>
      </div>
    </div>
  );
};

export default Home;