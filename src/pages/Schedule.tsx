import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Bell, BellOff, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { notificationService } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Class {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  room?: string;
}

interface WeekSchedule {
  monday: Class[];
  tuesday: Class[];
  wednesday: Class[];
  thursday: Class[];
  friday: Class[];
}

const Schedule = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [scheduleOdd, setScheduleOdd] = useState<WeekSchedule | null>(null);
  const [scheduleEven, setScheduleEven] = useState<WeekSchedule | null>(null);
  const [weekType, setWeekType] = useState<'odd' | 'even'>('odd');
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState("monday");
  const [notificationMinutes, setNotificationMinutes] = useState(5);
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
  });
  const [enabledClasses, setEnabledClasses] = useState<Record<string, boolean>>({});
  const [enabledClassesOdd, setEnabledClassesOdd] = useState<Record<string, boolean>>({});
  const [enabledClassesEven, setEnabledClassesEven] = useState<Record<string, boolean>>({});
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [scheduleType, setScheduleType] = useState<string>("weekly");
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    name: "",
    room: "",
    start: "",
    end: "",
    day: "monday",
    color: "#FF6B6B"
  });

  const days = [
    { key: "monday", label: "Mån" },
    { key: "tuesday", label: "Tis" },
    { key: "wednesday", label: "Ons" },
    { key: "thursday", label: "Tor" },
    { key: "friday", label: "Fre" },
  ];

  useEffect(() => {
    const initializeSchedule = async () => {
      const type = localStorage.getItem("scheduleType") || "weekly";
      console.log('Schedule page initializing with type:', type);
      setScheduleType(type);

      // Helper function to get current week number and determine if odd/even
      const getCurrentWeekType = (): 'odd' | 'even' => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        return weekNumber % 2 === 0 ? 'even' : 'odd';
      };

      if (type === "oddeven") {
        const savedOdd = localStorage.getItem("scheduleOdd");
        const savedEven = localStorage.getItem("scheduleEven");
        
        console.log('Checking for oddeven schedules, odd:', !!savedOdd, 'even:', !!savedEven);
        
        if (savedOdd && savedEven) {
          const parsedOdd = JSON.parse(savedOdd);
          const parsedEven = JSON.parse(savedEven);
          setScheduleOdd(parsedOdd);
          setScheduleEven(parsedEven);
          
          // Automatically set to current week
          const currentWeek = getCurrentWeekType();
          setWeekType(currentWeek);
          setSchedule(currentWeek === 'odd' ? parsedOdd : parsedEven);
          
          // Initialize classes for odd schedule
          const allClassesOdd: Record<string, boolean> = {};
          Object.values(parsedOdd).forEach((dayClasses: Class[]) => {
            dayClasses.forEach((classItem) => {
              allClassesOdd[classItem.id] = true;
            });
          });
          
          // Initialize classes for even schedule
          const allClassesEven: Record<string, boolean> = {};
          Object.values(parsedEven).forEach((dayClasses: Class[]) => {
            dayClasses.forEach((classItem) => {
              allClassesEven[classItem.id] = true;
            });
          });
          
          const savedEnabledClassesOdd = localStorage.getItem("enabledClassesOdd");
          const savedEnabledClassesEven = localStorage.getItem("enabledClassesEven");
          
          const finalOdd = savedEnabledClassesOdd 
            ? { ...allClassesOdd, ...JSON.parse(savedEnabledClassesOdd) }
            : allClassesOdd;
          const finalEven = savedEnabledClassesEven
            ? { ...allClassesEven, ...JSON.parse(savedEnabledClassesEven) }
            : allClassesEven;
            
          setEnabledClassesOdd(finalOdd);
          setEnabledClassesEven(finalEven);
          setEnabledClasses(currentWeek === 'odd' ? finalOdd : finalEven);
        } else {
          navigate("/");
          return;
        }
      } else {
        const savedSchedule = localStorage.getItem("schedule");
        if (savedSchedule) {
          const parsedSchedule = JSON.parse(savedSchedule);
          setSchedule(parsedSchedule);
          
          // Initialize all classes as enabled by default
          const allClasses: Record<string, boolean> = {};
          Object.values(parsedSchedule).forEach((dayClasses: Class[]) => {
            dayClasses.forEach((classItem) => {
              allClasses[classItem.id] = true;
            });
          });
          
          const savedEnabledClasses = localStorage.getItem("enabledClasses");
          if (savedEnabledClasses) {
            setEnabledClasses({ ...allClasses, ...JSON.parse(savedEnabledClasses) });
          } else {
            setEnabledClasses(allClasses);
          }
        } else {
          navigate("/");
          return;
        }
      }

      const savedMinutes = localStorage.getItem("globalNotificationMinutes");
      if (savedMinutes) {
        setNotificationMinutes(parseInt(savedMinutes));
      }

      const savedEnabledDays = localStorage.getItem("enabledDays");
      if (savedEnabledDays) {
        setEnabledDays(JSON.parse(savedEnabledDays));
      }

      // Check notification permissions
      const hasPermission = await notificationService.checkPermissions();
      setHasNotificationPermission(hasPermission);
      setCheckingPermissions(false);
    };

    initializeSchedule();
  }, [navigate]);

  const handleWeekToggle = (type: 'odd' | 'even') => {
    setWeekType(type);
    if (type === 'odd' && scheduleOdd) {
      setSchedule(scheduleOdd);
      setEnabledClasses(enabledClassesOdd);
    } else if (type === 'even' && scheduleEven) {
      setSchedule(scheduleEven);
      setEnabledClasses(enabledClassesEven);
    }
  };

  const handleNotificationChange = async (value: number[]) => {
    setNotificationMinutes(value[0]);
    localStorage.setItem("globalNotificationMinutes", value[0].toString());
    
    // Reschedule notifications with new time
    if (schedule && hasNotificationPermission) {
      const scheduleType = localStorage.getItem("scheduleType") || "weekly";
      await notificationService.scheduleNotifications(
        schedule,
        enabledClasses,
        enabledDays,
        value[0],
        scheduleType
      );
    }
  };

  const handleDayToggle = async (day: string) => {
    const updated = { ...enabledDays, [day]: !enabledDays[day] };
    setEnabledDays(updated);
    localStorage.setItem("enabledDays", JSON.stringify(updated));
    
    // Reschedule notifications
    if (schedule && hasNotificationPermission) {
      const scheduleType = localStorage.getItem("scheduleType") || "weekly";
      await notificationService.scheduleNotifications(
        schedule,
        enabledClasses,
        updated,
        notificationMinutes,
        scheduleType
      );
    }
  };

  const toggleAllDays = async () => {
    const allChecked = Object.values(enabledDays).every(v => v);
    const updated = {
      monday: !allChecked,
      tuesday: !allChecked,
      wednesday: !allChecked,
      thursday: !allChecked,
      friday: !allChecked,
    };
    setEnabledDays(updated);
    localStorage.setItem("enabledDays", JSON.stringify(updated));
    
    // Reschedule notifications
    if (schedule && hasNotificationPermission) {
      const scheduleType = localStorage.getItem("scheduleType") || "weekly";
      await notificationService.scheduleNotifications(
        schedule,
        enabledClasses,
        updated,
        notificationMinutes,
        scheduleType
      );
    }
  };

  const handleClassToggle = async (classId: string) => {
    const updated = { ...enabledClasses, [classId]: !enabledClasses[classId] };
    setEnabledClasses(updated);
    
    // Save to the correct storage based on current week type
    if (scheduleType === "oddeven") {
      if (weekType === 'odd') {
        setEnabledClassesOdd(updated);
        localStorage.setItem("enabledClassesOdd", JSON.stringify(updated));
      } else {
        setEnabledClassesEven(updated);
        localStorage.setItem("enabledClassesEven", JSON.stringify(updated));
      }
    } else {
      localStorage.setItem("enabledClasses", JSON.stringify(updated));
    }
    
    // Reschedule notifications
    if (schedule && hasNotificationPermission) {
      const scheduleType = localStorage.getItem("scheduleType") || "weekly";
      await notificationService.scheduleNotifications(
        schedule,
        updated,
        enabledDays,
        notificationMinutes,
        scheduleType
      );
    }
  };

  const handleReplaceSchedule = async () => {
    await notificationService.cancelAllNotifications();
    navigate("/upload");
  };

  const handleRequestPermissions = async () => {
    const granted = await notificationService.requestPermissions();
    setHasNotificationPermission(granted);
    
    if (granted) {
      toast({
        title: "Notiser aktiverade",
        description: "Du får nu påminnelser innan dina lektioner",
      });
      
      // Schedule notifications immediately
      if (schedule) {
        const scheduleType = localStorage.getItem("scheduleType") || "weekly";
        await notificationService.scheduleNotifications(
          schedule,
          enabledClasses,
          enabledDays,
          notificationMinutes,
          scheduleType
        );
      }
    } else {
      toast({
        title: "Notiser nekade",
        description: "Gå till inställningar för att aktivera notiser",
        variant: "destructive",
      });
    }
  };

  const handleAddClass = () => {
    if (!newClass.name || !newClass.start || !newClass.end) return;

    const newClassItem: Class = {
      id: `custom-${Date.now()}`,
      name: newClass.name,
      room: newClass.room,
      start: newClass.start,
      end: newClass.end,
      color: newClass.color
    };

    const currentSchedule = scheduleType === "oddeven" 
      ? (weekType === 'odd' ? scheduleOdd : scheduleEven)
      : schedule;

    if (!currentSchedule) return;

    // Add and sort classes by start time
    const dayClasses = [...(currentSchedule[newClass.day as keyof WeekSchedule] || []), newClassItem];
    dayClasses.sort((a, b) => {
      const timeA = a.start.split(':').map(Number);
      const timeB = b.start.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

    const updatedSchedule = {
      ...currentSchedule,
      [newClass.day]: dayClasses
    };

    // Update the appropriate schedule
    if (scheduleType === "oddeven") {
      if (weekType === 'odd') {
        setScheduleOdd(updatedSchedule);
        localStorage.setItem("scheduleOdd", JSON.stringify(updatedSchedule));
      } else {
        setScheduleEven(updatedSchedule);
        localStorage.setItem("scheduleEven", JSON.stringify(updatedSchedule));
      }
    } else {
      localStorage.setItem("schedule", JSON.stringify(updatedSchedule));
    }

    setSchedule(updatedSchedule);

    // Enable the new class for notifications by default
    const updatedEnabledClasses = { ...enabledClasses, [newClassItem.id]: true };
    setEnabledClasses(updatedEnabledClasses);
    
    if (scheduleType === "oddeven") {
      if (weekType === 'odd') {
        setEnabledClassesOdd(updatedEnabledClasses);
        localStorage.setItem("enabledClassesOdd", JSON.stringify(updatedEnabledClasses));
      } else {
        setEnabledClassesEven(updatedEnabledClasses);
        localStorage.setItem("enabledClassesEven", JSON.stringify(updatedEnabledClasses));
      }
    } else {
      localStorage.setItem("enabledClasses", JSON.stringify(updatedEnabledClasses));
    }

    // Reset form and close dialog
    setNewClass({
      name: "",
      room: "",
      start: "",
      end: "",
      day: "monday",
      color: "#FF6B6B"
    });
    setIsAddClassOpen(false);

    toast({
      title: "Lektion tillagd",
      description: `${newClass.name} har lagts till i schemat`,
    });
  };

  const getColorClass = (className: string) => {
    const nameLower = className.toLowerCase();
    
    if (nameLower.includes('mat') || nameLower.includes('math')) return "bg-schedule-math";
    if (nameLower.includes('sven') || nameLower.includes('svensk')) return "bg-schedule-history";
    if (nameLower.includes('eng')) return "bg-schedule-art";
    if (nameLower.includes('lunch')) return "bg-schedule-pe";
    if (nameLower.includes('prog') || nameLower.includes('tek')) return "bg-schedule-science";
    if (nameLower.includes('fys') || nameLower.includes('kemi')) return "bg-schedule-science";
    if (nameLower.includes('men') || nameLower.includes('läx')) return "bg-schedule-science";
    if (nameLower.includes('kons')) return "bg-schedule-science";
    
    return "bg-primary";
  };

  const calculateHeight = (start: string, end: string) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return Math.max(duration * 1.2, 60);
  };

  const getGridRow = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const startHour = 8;
    return ((hour - startHour) * 4 + Math.floor(minute / 15)) + 2;
  };

  const getRowSpan = (start: string, end: string) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return Math.ceil(duration / 15);
  };

  if (!schedule) return null;

  const currentDayClasses = schedule[selectedDay as keyof WeekSchedule] || [];
  const allDaysChecked = Object.values(enabledDays).every(v => v);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-4xl mx-auto p-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Hem
          </Button>
          <DarkModeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleReplaceSchedule}
            className="rounded-xl"
          >
            <Upload className="w-4 h-4 mr-2" />
            Uppdatera
          </Button>
        </div>

        {/* Notification Permission Banner */}
        {!checkingPermissions && !hasNotificationPermission && (
          <div className="mb-4 p-4 bg-secondary/50 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Aktivera påminnelser</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  För att få påminnelser innan dina lektioner behöver du aktivera notiser
                </p>
                <Button size="sm" onClick={handleRequestPermissions} className="gap-2">
                  <Bell className="h-4 w-4" />
                  Aktivera notiser
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Mitt Schema</h1>
        </div>

        {scheduleType === "oddeven" && (
          <div className="mb-4 flex gap-2">
            <Button
              variant={weekType === 'odd' ? 'default' : 'outline'}
              onClick={() => handleWeekToggle('odd')}
              className="flex-1"
            >
              Udda
              {weekType === 'odd' && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-background/20 rounded">
                  Aktiv
                </span>
              )}
            </Button>
            <Button
              variant={weekType === 'even' ? 'default' : 'outline'}
              onClick={() => handleWeekToggle('even')}
              className="flex-1"
            >
              Jämna
              {weekType === 'even' && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-background/20 rounded">
                  Aktiv
                </span>
              )}
            </Button>
          </div>
        )}

        <div className="mb-4 p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Påminnelse innan alla lektioner</label>
            <span className="text-sm font-semibold text-primary">
              {notificationMinutes} min
            </span>
          </div>
          <Slider
            value={[notificationMinutes]}
            onValueChange={handleNotificationChange}
            min={1}
            max={15}
            step={1}
            className="w-full [&_[role=slider]]:transition-all [&_[role=slider]]:duration-200"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1 min</span>
            <span>15 min</span>
          </div>
        </div>

        <div className="relative mb-4 p-1 bg-muted rounded-full">
          <div
            className="absolute top-1 bottom-1 bg-primary rounded-full transition-all duration-300 ease-out shadow-md"
            style={{
              left: viewMode === 'week' ? '0.25rem' : 
                    selectedDay === 'monday' ? 'calc(16.666%)' :
                    selectedDay === 'tuesday' ? 'calc(33.333%)' :
                    selectedDay === 'wednesday' ? 'calc(50%)' :
                    selectedDay === 'thursday' ? 'calc(66.666%)' :
                    'calc(83.333%)',
              width: 'calc(16.666%)'
            }}
          />
          <div className="relative flex items-center">
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 px-2 py-1.5 rounded-full font-medium transition-colors duration-200 text-xs relative z-10 ${
                viewMode === 'week'
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Vecka
            </button>
            {days.map((day) => (
              <button
                key={day.key}
                onClick={() => {
                  setViewMode('day');
                  setSelectedDay(day.key);
                }}
                className={`flex-1 px-2 py-1.5 rounded-full font-medium transition-colors duration-200 text-xs relative z-10 ${
                  viewMode === 'day' && selectedDay === day.key
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 p-4 rounded-2xl bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">Aktivera påminnelser för:</h3>
          <div className="flex items-center justify-between gap-1">
            <label className="flex items-center gap-1 cursor-pointer group">
              <div 
                onClick={() => toggleAllDays()}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  allDaysChecked 
                    ? 'bg-background border-border' 
                    : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'
                }`}
              >
                {allDaysChecked && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-xs font-medium">Vecka</span>
            </label>
            {days.map((day) => (
              <label key={day.key} className="flex items-center gap-1 cursor-pointer group">
                <div 
                  onClick={() => handleDayToggle(day.key)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    enabledDays[day.key]
                      ? 'bg-background border-border' 
                      : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'
                  }`}
                >
                  {enabledDays[day.key] && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-xs">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        {viewMode === 'week' ? (
          <div className="bg-card rounded-2xl border border-border p-2">
            <div className="grid grid-cols-5 gap-0 divide-x divide-border">
              {days.map((day) => (
                <div key={day.key} className="text-[10px] font-semibold text-center pb-1 border-b border-border">
                  {day.label}
                </div>
              ))}

              {days.map((day) => {
                const dayClasses = schedule[day.key as keyof WeekSchedule] || [];
                return (
                  <div key={day.key} className="space-y-1 pt-1 px-1">
                    {dayClasses.map((classItem) => (
                      <button
                        key={classItem.id}
                        onClick={() => navigate(`/edit-class/${classItem.id}`)}
                        className={`w-full p-1.5 rounded-lg ${getColorClass(
                          classItem.name
                        )} text-white text-left transition-all duration-300 ${
                          !enabledClasses[classItem.id] ? 'opacity-50' : 'opacity-100'
                        }`}
                        style={{
                          minHeight: `${Math.max(calculateHeight(classItem.start, classItem.end) * 0.6, 90)}px`,
                        }}
                      >
                        <div className="flex flex-col h-full justify-between gap-0.5">
                          <div className="flex items-start justify-between gap-1">
                            <div className="text-[8px] opacity-90 font-medium">
                              {classItem.start}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClassToggle(classItem.id);
                              }}
                              className="flex-shrink-0"
                            >
                              <div className={`w-3 h-3 rounded-full border-2 border-white flex items-center justify-center transition-all duration-300 ${
                                enabledClasses[classItem.id] ? 'bg-white' : 'bg-transparent'
                              }`}>
                                {enabledClasses[classItem.id] && (
                                  <div className="w-1 h-1 rounded-full bg-primary transition-all duration-300" />
                                )}
                              </div>
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-center px-0.5">
                            <div className="font-semibold text-[9px] leading-tight break-words">
                              {classItem.name}
                            </div>
                            {classItem.room && (
                              <div className="text-[7px] opacity-80 mt-0.5 break-words">{classItem.room}</div>
                            )}
                          </div>
                          <div className="text-[8px] opacity-90 font-medium">
                            {classItem.end}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {currentDayClasses.length > 0 ? (
              currentDayClasses.map((classItem) => (
                <div key={classItem.id} className="relative">
                  <button
                    onClick={() => navigate(`/edit-class/${classItem.id}`)}
                    className={`w-full p-3 rounded-xl ${getColorClass(
                      classItem.name
                    )} text-white shadow-sm transition-all duration-300 text-left border-l-4 border-white/30 ${
                      !enabledClasses[classItem.id] ? 'opacity-50' : 'opacity-100'
                    }`}
                    style={{
                      height: `${calculateHeight(classItem.start, classItem.end)}px`,
                      minHeight: "80px",
                    }}
                  >
                    <div className="flex items-start justify-between h-full">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold">{classItem.name}</h3>
                        {classItem.room && (
                          <p className="text-xs opacity-80 mt-0.5">{classItem.room}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs opacity-90 mt-1">
                          <span>{classItem.start}</span>
                          <span>-</span>
                          <span>{classItem.end}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClassToggle(classItem.id);
                        }}
                        className="flex-shrink-0"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center transition-all duration-300 ${
                          enabledClasses[classItem.id] ? 'bg-white' : 'bg-transparent'
                        }`}>
                          {enabledClasses[classItem.id] && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary transition-all duration-300" />
                          )}
                        </div>
                      </button>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-6 rounded-2xl bg-card border border-border">
                <p className="text-muted-foreground text-sm">Inga lektioner denna dag</p>
              </div>
            )}
          </div>
        )}

        {/* Floating Add Button */}
        <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="fixed bottom-6 right-6 h-10 w-10 rounded-full shadow-sm bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-border transition-all"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Lägg till lektion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Lektionsnamn</Label>
                <Input
                  id="name"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="t.ex. Svenska A1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Sal</Label>
                <Input
                  id="room"
                  value={newClass.room}
                  onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                  placeholder="t.ex. BRR2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Starttid</Label>
                  <Input
                    id="start"
                    type="time"
                    value={newClass.start}
                    onChange={(e) => setNewClass({ ...newClass, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Sluttid</Label>
                  <Input
                    id="end"
                    type="time"
                    value={newClass.end}
                    onChange={(e) => setNewClass({ ...newClass, end: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="day">Dag</Label>
                <Select value={newClass.day} onValueChange={(value) => setNewClass({ ...newClass, day: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Måndag</SelectItem>
                    <SelectItem value="tuesday">Tisdag</SelectItem>
                    <SelectItem value="wednesday">Onsdag</SelectItem>
                    <SelectItem value="thursday">Torsdag</SelectItem>
                    <SelectItem value="friday">Fredag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Färg</Label>
                <div className="flex gap-2">
                  {["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewClass({ ...newClass, color })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        newClass.color === color ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleAddClass}
                className="w-full"
                disabled={!newClass.name || !newClass.start || !newClass.end}
              >
                Lägg till
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Schedule;
