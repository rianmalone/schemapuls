import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";

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

const ScheduleCompact = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [notificationMinutes, setNotificationMinutes] = useState(5);

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
      setSchedule(JSON.parse(savedSchedule));
    } else {
      navigate("/");
    }

    const savedMinutes = localStorage.getItem("globalNotificationMinutes");
    if (savedMinutes) {
      setNotificationMinutes(parseInt(savedMinutes));
    }
  }, [navigate]);

  const handleNotificationChange = (value: number[]) => {
    setNotificationMinutes(value[0]);
    localStorage.setItem("globalNotificationMinutes", value[0].toString());
  };

  const handleDeleteClass = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!schedule) return;
    
    const updatedSchedule = { ...schedule };
    Object.keys(updatedSchedule).forEach((day) => {
      updatedSchedule[day as keyof WeekSchedule] = updatedSchedule[day as keyof WeekSchedule].filter(
        (c) => c.id !== classId
      );
    });
    
    setSchedule(updatedSchedule);
    localStorage.setItem("schedule", JSON.stringify(updatedSchedule));
  };

  const handleReplaceSchedule = () => {
    navigate("/upload");
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      math: "bg-schedule-math",
      english: "bg-schedule-english",
      science: "bg-schedule-science",
      history: "bg-schedule-history",
      pe: "bg-schedule-pe",
      art: "bg-schedule-art",
    };
    return colorMap[color] || "bg-primary";
  };

  if (!schedule) return null;

  // Get all unique time slots
  const allClasses = Object.values(schedule).flat();
  const timeSlots = Array.from(
    new Set(allClasses.flatMap((c) => [c.start, c.end]))
  ).sort();

  const getWeekNumber = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-md mx-auto p-3 pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Hem
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/schedule")}
              className="rounded-xl text-xs px-2"
            >
              Dagsvy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplaceSchedule}
              className="rounded-xl text-xs px-2"
            >
              <Upload className="w-3 h-3 mr-1" />
              Uppdatera
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground mb-0.5">Mitt Schema</h1>
          <p className="text-xs text-muted-foreground">Vecka {getWeekNumber()}</p>
        </div>

        <div className="mb-3 p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium">Påminnelse innan lektion</label>
            <span className="text-xs font-semibold text-primary">
              {notificationMinutes} min
            </span>
          </div>
          <Slider
            value={[notificationMinutes]}
            onValueChange={handleNotificationChange}
            min={1}
            max={15}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>1 min</span>
            <span>15 min</span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 px-3">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-6 gap-0.5 text-[10px]">
              <div className="text-xs font-medium text-muted-foreground py-1.5 bg-background sticky left-0 z-10">
                Tid
              </div>
              {days.map((day) => (
                <div
                  key={day.key}
                  className="text-xs font-semibold text-center py-1.5 bg-card rounded-t-lg border-x border-t border-border"
                >
                  {day.label}
                </div>
              ))}

              {timeSlots.slice(0, -1).map((time, idx) => {
                const nextTime = timeSlots[idx + 1];
                if (!nextTime) return null;

                return (
                  <>
                    <div className="text-[10px] text-muted-foreground py-1 text-right pr-1 bg-background sticky left-0 z-10 font-medium">
                      {time}
                    </div>
                    {days.map((day) => {
                      const dayClasses = schedule[day.key as keyof WeekSchedule] || [];
                      const classInSlot = dayClasses.find(
                        (c) => c.start === time
                      );

                      if (classInSlot) {
                        const startIdx = timeSlots.indexOf(classInSlot.start);
                        const endIdx = timeSlots.indexOf(classInSlot.end);
                        const rowSpan = endIdx - startIdx;

                        return (
                          <div
                            key={`${day.key}-${classInSlot.id}`}
                            className="relative group border-x border-border"
                            style={{
                              gridRow: `span ${rowSpan}`,
                            }}
                          >
                            <button
                              onClick={() => navigate(`/edit-class/${classInSlot.id}`)}
                              className={`${getColorClass(
                                classInSlot.color
                              )} text-white w-full h-full p-1.5 text-left hover:opacity-90 transition-opacity relative`}
                            >
                              <div className="text-[10px] font-semibold leading-tight line-clamp-2">
                                {classInSlot.name}
                              </div>
                              {classInSlot.room && (
                                <div className="text-[9px] opacity-80 mt-0.5">
                                  {classInSlot.room}
                                </div>
                              )}
                              <div className="text-[9px] opacity-70 mt-0.5">
                                {classInSlot.start} - {classInSlot.end}
                              </div>
                            </button>
                            <button
                              onClick={(e) => handleDeleteClass(classInSlot.id, e)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                        );
                      }

                      // Check if this slot is part of a multi-hour class
                      const isPartOfClass = dayClasses.some((c) => {
                        const cStart = timeSlots.indexOf(c.start);
                        const cEnd = timeSlots.indexOf(c.end);
                        const currentIdx = timeSlots.indexOf(time);
                        return currentIdx > cStart && currentIdx < cEnd;
                      });

                      if (isPartOfClass) {
                        return null;
                      }

                      return (
                        <div
                          key={`${day.key}-${time}-empty`}
                          className="bg-muted/20 border-x border-border min-h-[32px]"
                        />
                      );
                    })}
                  </>
                );
              })}
              
              <div className="bg-background"></div>
              {days.map((day) => (
                <div
                  key={`${day.key}-bottom`}
                  className="border-x border-b border-border rounded-b-lg bg-card h-0.5"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCompact;
