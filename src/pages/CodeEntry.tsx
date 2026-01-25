import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, AlertCircle } from "lucide-react";

const VALID_CODES = ["Tychobrahe", "Admin123"];

interface CodeEntryProps {
  onSuccess: () => void;
}

const CodeEntry = ({ onSuccess }: CodeEntryProps) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Small delay for UX
    setTimeout(() => {
      const trimmedCode = code.trim();
      
      if (VALID_CODES.includes(trimmedCode)) {
        // Store access permanently
        localStorage.setItem("schemapuls_access", "granted");
        localStorage.setItem("schemapuls_code_used", trimmedCode);
        onSuccess();
      } else {
        setError("Ogiltig kod. Försök igen.");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">SchemaPuls</CardTitle>
          <CardDescription>
            Ange din åtkomstkod för att fortsätta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Ange kod..."
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                className="text-center text-lg"
                autoFocus
              />
              {error && (
                <div className="flex items-center justify-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!code.trim() || isLoading}
            >
              {isLoading ? "Kontrollerar..." : "Fortsätt"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeEntry;
