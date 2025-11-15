import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Settings, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import ScheduleCard from "@/components/ScheduleCard";

interface Class {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  notificationMinutes?: number;
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

    const notifPermission = localStorage.getItem("notificationsEnabled");
    setNotificationsEnabled(notifPermission === "true");
  }, [navigate]);

  const handleEnableNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        localStorage.setItem("notificationsEnabled", "true");
        setNotificationsEnabled(true);
      }
    }
  };

  if (!schedule) return null;

  const currentDayClasses = schedule[selectedDay as keyof WeekSchedule] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-md mx-auto p-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mitt Schema</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vecka {new Date().getWeek()}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {!notificationsEnabled && (
          <div className="mb-6 p-4 rounded-2xl bg-secondary/10 border border-secondary/20">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-secondary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Aktivera påminnelser
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Få notiser innan dina lektioner börjar
                </p>
                <Button
                  onClick={handleEnableNotifications}
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                >
                  Aktivera
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {days.map((day) => (
            <button
              key={day.key}
              onClick={() => setSelectedDay(day.key)}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl font-medium transition-all ${
                selectedDay === day.key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {currentDayClasses.length > 0 ? (
            currentDayClasses.map((classItem) => (
              <ScheduleCard
                key={classItem.id}
                classItem={classItem}
                onClick={() => navigate(`/edit-class/${classItem.id}`)}
              />
            ))
          ) : (
            <div className="text-center py-12 px-6 rounded-2xl bg-card border border-border">
              <p className="text-muted-foreground">Inga lektioner denna dag</p>
            </div>
          )}
        </div>

        <Button
          onClick={() => navigate("/add-class")}
          className="w-full h-14 rounded-2xl shadow-lg hover:shadow-xl transition-all mt-6"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Lägg till lektion
        </Button>
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
