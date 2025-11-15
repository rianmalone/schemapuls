import { Bell } from "lucide-react";

interface Class {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  room?: string;
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
      className={`w-full p-3 rounded-xl ${getColorClass(
        classItem.color
      )} text-white shadow-sm hover:shadow-md transition-all text-left`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{classItem.name}</h3>
        <div className="flex items-center gap-1.5 text-xs opacity-90">
          <span>{classItem.start}</span>
          <span>-</span>
          <span>{classItem.end}</span>
        </div>
      </div>
      {classItem.room && (
        <p className="text-xs opacity-80 mt-1">{classItem.room}</p>
      )}
    </button>
  );
};

export default ScheduleCard;
