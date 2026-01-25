import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Generate or retrieve a unique device ID
const getDeviceId = (): string => {
  const stored = localStorage.getItem("schemapuls_device_id");
  if (stored) return stored;
  
  const newId = crypto.randomUUID();
  localStorage.setItem("schemapuls_device_id", newId);
  return newId;
};

interface CodeEntryProps {
  onSuccess: () => void;
  onAccessRevoked?: () => void;
}

const CodeEntry = ({ onSuccess }: CodeEntryProps) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const deviceId = getDeviceId();
      const trimmedCode = code.trim();

      const { data, error: fnError } = await supabase.functions.invoke("validate-code", {
        body: { action: "redeem", code: trimmedCode, device_id: deviceId }
      });

      if (fnError) {
        console.error("Function error:", fnError);
        setError("Ett fel uppstod. Försök igen.");
        setIsLoading(false);
        return;
      }

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Ogiltig kod. Försök igen.");
      }
    } catch (err) {
      console.error("Error redeeming code:", err);
      setError("Ett fel uppstod. Försök igen.");
    }

    setIsLoading(false);
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
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kontrollerar...
                </>
              ) : (
                "Fortsätt"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Export utility for checking access
export const checkServerAccess = async (): Promise<boolean> => {
  const deviceId = localStorage.getItem("schemapuls_device_id");
  if (!deviceId) return false;

  try {
    const { data, error } = await supabase.functions.invoke("validate-code", {
      body: { action: "check", device_id: deviceId }
    });

    if (error) {
      console.error("Error checking access:", error);
      return false;
    }

    return data?.hasAccess === true;
  } catch (err) {
    console.error("Error checking server access:", err);
    return false;
  }
};

export default CodeEntry;
