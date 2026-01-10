import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Class {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  room?: string;
}

const EditClass = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [classData, setClassData] = useState<Class | null>(null);

  useEffect(() => {
    const viewingScheduleId = localStorage.getItem("currentlyViewingScheduleId");
    
    if (!viewingScheduleId) {
      console.error('[EditClass] currentlyViewingScheduleId is missing!');
      navigate("/");
      return;
    }
    
    const storageKey = `schedule_${viewingScheduleId}`;
    const scheduleData = localStorage.getItem(storageKey);
    
    if (scheduleData) {
      const schedule = JSON.parse(scheduleData);
      // Find class in all days
      for (const day of Object.values(schedule) as Class[][]) {
        const foundClass = day.find((c) => c.id === id);
        if (foundClass) {
          setClassData(foundClass);
          break;
        }
      }
    }
  }, [id, navigate]);

  const handleSave = () => {
    if (!classData) return;

    // Validate that both times are filled in
    if (!classData.start || !classData.end) {
      toast({
        title: "Saknade tider",
        description: "Du måste ange både start- och sluttid",
        variant: "destructive",
      });
      return;
    }

    // Validate that start time is before end time
    const [startHour, startMin] = classData.start.split(':').map(Number);
    const [endHour, endMin] = classData.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      toast({
        title: "Ogiltig tid",
        description: "Starttiden måste vara före sluttiden",
        variant: "destructive",
      });
      return;
    }

    const viewingScheduleId = localStorage.getItem("currentlyViewingScheduleId");
    
    if (!viewingScheduleId) {
      toast({
        title: "Fel",
        description: "Kunde inte hitta schemat",
        variant: "destructive",
      });
      return;
    }
    
    const storageKey = `schedule_${viewingScheduleId}`;
    const scheduleData = localStorage.getItem(storageKey);
    
    if (scheduleData) {
      const schedule = JSON.parse(scheduleData);
      
      // Update class in schedule
      for (const dayKey of Object.keys(schedule)) {
        const dayClasses = schedule[dayKey];
        const index = dayClasses.findIndex((c: Class) => c.id === id);
        if (index !== -1) {
          schedule[dayKey][index] = classData;
          break;
        }
      }
      
      // Save only to per-schedule key
      localStorage.setItem(storageKey, JSON.stringify(schedule));
      
      toast({
        title: "Sparat!",
        description: "Dina ändringar har sparats",
      });
      
      navigate("/schedule");
    }
  };

  const handleDelete = () => {
    if (!classData) return;

    const viewingScheduleId = localStorage.getItem("currentlyViewingScheduleId");
    
    if (!viewingScheduleId) {
      toast({
        title: "Fel",
        description: "Kunde inte hitta schemat",
        variant: "destructive",
      });
      return;
    }
    
    const storageKey = `schedule_${viewingScheduleId}`;
    const scheduleData = localStorage.getItem(storageKey);
    
    if (scheduleData) {
      const schedule = JSON.parse(scheduleData);
      
      for (const dayKey of Object.keys(schedule)) {
        schedule[dayKey] = schedule[dayKey].filter((c: Class) => c.id !== id);
      }
      
      // Save only to per-schedule key
      localStorage.setItem(storageKey, JSON.stringify(schedule));
      
      toast({
        title: "Raderad",
        description: "Lektionen har raderats",
      });
      
      navigate("/schedule");
    }
  };

  if (!classData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-md mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/schedule")}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Redigera lektion</h1>

          <div className="space-y-6 p-6 rounded-2xl bg-card border border-border">
            <div className="space-y-2">
              <Label htmlFor="name">Lektionsnamn</Label>
              <Input
                id="name"
                value={classData.name}
                onChange={(e) =>
                  setClassData({ ...classData, name: e.target.value })
                }
                className="rounded-xl"
                maxLength={25}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Sal (valfritt)</Label>
              <Input
                id="room"
                value={classData.room || ""}
                onChange={(e) =>
                  setClassData({ ...classData, room: e.target.value })
                }
                className="rounded-xl"
                placeholder="t.ex. 206"
                maxLength={25}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Starttid</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="start"
                    type="time"
                    value={classData.start}
                    onChange={(e) => setClassData({ ...classData, start: e.target.value })}
                    className="rounded-xl w-full pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end">Sluttid</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="end"
                    type="time"
                    value={classData.end}
                    onChange={(e) => setClassData({ ...classData, end: e.target.value })}
                    className="rounded-xl w-full pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            className="w-full h-14 text-lg rounded-2xl shadow-lg transition-all"
            size="lg"
          >
            Spara ändringar
          </Button>

          <Button
            onClick={handleDelete}
            variant="destructive"
            className="w-full h-14 text-lg rounded-2xl"
            size="lg"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Radera lektion
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditClass;