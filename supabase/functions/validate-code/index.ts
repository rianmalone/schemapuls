import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, code, deviceId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "check") {
      // Check if device has any non-revoked activation
      const { data: activations } = await supabase
        .from("device_activations")
        .select("id")
        .eq("device_id", deviceId)
        .eq("is_revoked", false)
        .limit(1);

      const hasAccess = activations && activations.length > 0;
      return new Response(JSON.stringify({ success: hasAccess }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "redeem") {
      // Find the code
      const { data: codeRecord } = await supabase
        .from("access_codes")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .single();

      if (!codeRecord) {
        return new Response(
          JSON.stringify({ success: false, message: "Tyvärr, fel kod" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if device is revoked for THIS specific code
      const { data: revokedActivation } = await supabase
        .from("device_activations")
        .select("id")
        .eq("device_id", deviceId)
        .eq("code_id", codeRecord.id)
        .eq("is_revoked", true)
        .limit(1);

      if (revokedActivation && revokedActivation.length > 0) {
        return new Response(
          JSON.stringify({ success: false, message: "Denna kod har återkallats för din enhet" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if device already has a non-revoked activation for this code
      const { data: existingActivation } = await supabase
        .from("device_activations")
        .select("id")
        .eq("device_id", deviceId)
        .eq("code_id", codeRecord.id)
        .eq("is_revoked", false)
        .limit(1);

      if (existingActivation && existingActivation.length > 0) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check usage limits
      if (codeRecord.max_uses !== null && codeRecord.current_uses >= codeRecord.max_uses) {
        return new Response(
          JSON.stringify({ success: false, message: "Denna kod har nått sin gräns" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create activation
      await supabase.from("device_activations").insert({
        device_id: deviceId,
        code_id: codeRecord.id,
      });

      // Increment usage
      await supabase
        .from("access_codes")
        .update({ current_uses: codeRecord.current_uses + 1 })
        .eq("id", codeRecord.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-code error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
