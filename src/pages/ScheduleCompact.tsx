import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Upload } from "lucide-react";
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
      <div className="max-w-6xl mx-auto p-4 pt-6">
        <div className="flex items-center justify-between mb-6">
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
              className="rounded-xl"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Dagsvy
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
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Mitt Schema</h1>
          <p className="text-sm text-muted-foreground">Vecka {getWeekNumber()}</p>
        </div>

        <div className="mb-6 p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Påminnelse innan lektion</label>
            <span className="text-sm font-semibold text-primary">
              {notificationMinutes} min
            </span>
          </div>
          <Slider
            value={[notificationMinutes]}
            onValueChange={handleNotificationChange}
            min={2}
            max={15}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>2 min</span>
            <span>15 min</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-6 gap-2 min-w-[800px]">
              <div className="text-xs font-medium text-muted-foreground py-2">Tid</div>
              {days.map((day) => (
                <div key={day.key} className="text-sm font-semibold text-center py-2">
                  {day.label}
                </div>
              ))}

              {timeSlots.slice(0, -1).map((time, idx) => {
                const nextTime = timeSlots[idx + 1];
                if (!nextTime) return null;

                return (
                  <>
                    <div className="text-xs text-muted-foreground py-1 pr-2 text-right">
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
                          <button
                            key={`${day.key}-${classInSlot.id}`}
                            onClick={() => navigate(`/edit-class/${classInSlot.id}`)}
                            className={`${getColorClass(
                              classInSlot.color
                            )} text-white rounded-xl p-2 text-left hover:opacity-90 transition-opacity`}
                            style={{
                              gridRow: `span ${rowSpan}`,
                            }}
                          >
                            <div className="text-xs font-semibold leading-tight">
                              {classInSlot.name}
                            </div>
                            {classInSlot.room && (
                              <div className="text-xs opacity-80 mt-0.5">
                                {classInSlot.room}
                              </div>
                            )}
                          </button>
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
                          className="bg-muted/30 rounded-xl"
                        />
                      );
                    })}
                  </>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCompact;
