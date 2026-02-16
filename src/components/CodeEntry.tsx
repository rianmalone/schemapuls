import { useState } from "react";
import { KeyRound, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CodeEntryProps {
  onAccessGranted: () => void;
}

const CodeEntry = ({ onAccessGranted }: CodeEntryProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getOrCreateDeviceId = (): string => {
    let deviceId = localStorage.getItem("schemapuls_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("schemapuls_device_id", deviceId);
    }
    return deviceId;
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
      const deviceId = getOrCreateDeviceId();
      const { data, error: fnError } = await supabase.functions.invoke("validate-code", {
        body: { action: "redeem", code: code.trim(), deviceId },
      });

      if (fnError) {
        setError("Ett fel uppstod. Försök igen.");
        setLoading(false);
        return;
      }

      if (data?.success) {
        localStorage.setItem("schemapuls_access", "granted");
        onAccessGranted();
      } else {
        setError(data?.message || "Tyvärr, fel kod");
      }
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">SchemaPuls</h1>
          <p className="text-sm text-muted-foreground">Ange din åtkomstkod för att fortsätta</p>
        </div>

        {/* Input */}
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ange kod..."
          className="w-full h-12 rounded-xl bg-background border border-border px-4 text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
          autoFocus
        />

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Kontrollerar...
            </>
          ) : (
            "Fortsätt"
          )}
        </button>
      </div>
    </div>
  );
};

export default CodeEntry;
