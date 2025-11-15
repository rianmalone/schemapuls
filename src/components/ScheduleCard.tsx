import { Bell } from "lucide-react";

interface Class {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  notificationMinutes?: number;
}

interface ScheduleCardProps {
  classItem: Class;
  onClick: () => void;
}

const ScheduleCard = ({ classItem, onClick }: ScheduleCardProps) => {
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

  return (
    <button
      onClick={onClick}
      className={`w-full p-5 rounded-2xl ${getColorClass(
        classItem.color
      )} text-white shadow-md hover:shadow-xl transition-all text-left`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold">{classItem.name}</h3>
        {classItem.notificationMinutes && (
          <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
            <Bell className="w-3 h-3" />
            <span className="text-xs">{classItem.notificationMinutes} min</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm opacity-90">
        <span>{classItem.start}</span>
        <span>→</span>
        <span>{classItem.end}</span>
      </div>
    </button>
  );
};

export default ScheduleCard;
