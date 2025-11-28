import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, Bell } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-4">
            <Calendar className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">ClassPulse</h1>
          <p className="text-lg text-muted-foreground">
            Ditt smarta schema med påminnelser innan varje lektion
          </p>
        </div>

        <div className="space-y-4 pt-8">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border">
            <Bell className="w-5 h-5 text-secondary mt-0.5" />
            <div className="text-left">
              <h3 className="font-semibold text-card-foreground mb-1">
                Smarta påminnelser
              </h3>
              <p className="text-sm text-muted-foreground">
                Få notiser innan varje lektion börjar
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border">
            <Calendar className="w-5 h-5 text-accent mt-0.5" />
            <div className="text-left">
              <h3 className="font-semibold text-card-foreground mb-1">
                Ladda upp ditt schema
              </h3>
              <p className="text-sm text-muted-foreground">
                Ta en bild av ditt schema så skapar vi det automatiskt
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate("/schedule-type")}
          className="w-full h-14 text-lg rounded-2xl shadow-lg transition-all"
          size="lg"
        >
          Skapa nytt schema
        </Button>

        <p className="text-xs text-muted-foreground pt-4">
          Inget konto behövs • Funkar direkt
        </p>
      </div>
    </div>
  );
};

export default Welcome;
