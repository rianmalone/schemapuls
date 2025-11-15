import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import ScheduleCard from "@/components/ScheduleCard";
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
  const [selectedDay, setSelectedDay] = useState("monday");
  const [notificationMinutes, setNotificationMinutes] = useState(5);
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
  });

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

  const handleReplaceSchedule = () => {
    navigate("/upload");
  };

  if (!schedule) return null;

  const currentDayClasses = schedule[selectedDay as keyof WeekSchedule] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-md mx-auto p-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            size="sm"
          >
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
            <label className="text-sm font-medium">Påminnelse innan lektion</label>
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
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1 min</span>
            <span>15 min</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => navigate("/schedule-week")}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all text-sm bg-card text-muted-foreground hover:bg-muted"
          >
            Veckovy
          </button>
          {days.map((day) => (
            <button
              key={day.key}
              onClick={() => setSelectedDay(day.key)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
                selectedDay === day.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="mb-4 p-4 rounded-2xl bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">Aktivera påminnelser för:</h3>
          <div className="flex flex-wrap gap-3">
            {days.map((day) => (
              <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={enabledDays[day.key]}
                  onCheckedChange={() => handleDayToggle(day.key)}
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {currentDayClasses.length > 0 ? (
            currentDayClasses.map((classItem) => (
              <ScheduleCard
                key={classItem.id}
                classItem={classItem}
                onClick={() => navigate(`/edit-class/${classItem.id}`)}
              />
            ))
          ) : (
            <div className="text-center py-8 px-6 rounded-2xl bg-card border border-border">
              <p className="text-muted-foreground text-sm">Inga lektioner denna dag</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Add week number to Date prototype
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function () {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
};

export default Schedule;
