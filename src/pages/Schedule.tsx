import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
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

  const days = [
    { key: "monday", label: "Mån" },
    { key: "tuesday", label: "Tis" },
    { key: "wednesday", label: "Ons" },
    { key: "thursday", label: "Tor" },
    { key: "friday", label: "Fre" },
  ];

  useEffect(() => {
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
    }

    const savedMinutes = localStorage.getItem("globalNotificationMinutes");
    if (savedMinutes) {
      setNotificationMinutes(parseInt(savedMinutes));
    }

    const savedEnabledDays = localStorage.getItem("enabledDays");
    if (savedEnabledDays) {
      setEnabledDays(JSON.parse(savedEnabledDays));
    }
  }, [navigate]);

  const handleNotificationChange = (value: number[]) => {
    setNotificationMinutes(value[0]);
    localStorage.setItem("globalNotificationMinutes", value[0].toString());
  };

  const handleDayToggle = (day: string) => {
    const updated = { ...enabledDays, [day]: !enabledDays[day] };
    setEnabledDays(updated);
    localStorage.setItem("enabledDays", JSON.stringify(updated));
  };

  const toggleAllDays = () => {
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
  };

  const handleClassToggle = (classId: string) => {
    const updated = { ...enabledClasses, [classId]: !enabledClasses[classId] };
    setEnabledClasses(updated);
    localStorage.setItem("enabledClasses", JSON.stringify(updated));
  };

  const handleReplaceSchedule = () => {
    navigate("/upload");
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

        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Mitt Schema</h1>
        </div>

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

        <div className="grid grid-cols-6 gap-1 mb-4">
          <button
            onClick={() => setViewMode('week')}
            className={`px-1 py-1.5 rounded-xl font-medium transition-all text-[10px] ${
              viewMode === 'week'
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Veckovy
          </button>
          {days.map((day) => (
            <button
              key={day.key}
              onClick={() => {
                setViewMode('day');
                setSelectedDay(day.key);
              }}
              className={`px-1 py-1.5 rounded-xl font-medium transition-all text-[10px] ${
                viewMode === 'day' && selectedDay === day.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="mb-4 p-3 rounded-2xl bg-card border border-border">
          <h3 className="text-[9px] font-medium mb-2">Aktivera påminnelser för:</h3>
          <div className="grid grid-cols-6 gap-2">
            <label className="flex items-center gap-1 cursor-pointer justify-start">
              <Checkbox
                checked={allDaysChecked}
                onCheckedChange={toggleAllDays}
              />
              <span className="text-[9px] font-semibold">Vecka</span>
            </label>
            {days.map((day) => (
              <label key={day.key} className="flex items-center gap-1 cursor-pointer justify-start">
                <Checkbox
                  checked={enabledDays[day.key]}
                  onCheckedChange={() => handleDayToggle(day.key)}
                />
                <span className="text-[9px]">{day.label}</span>
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
      </div>
    </div>
  );
};

export default Schedule;
