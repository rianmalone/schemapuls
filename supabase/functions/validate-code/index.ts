import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;
    const code = body.code;
    // Accept both camelCase and snake_case for device ID
    const deviceId = body.deviceId || body.device_id;

    console.log(`[validate-code] Action: ${action}, Device: ${deviceId?.substring(0, 8)}...`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "check") {
      if (!deviceId) {
        return new Response(JSON.stringify({ hasAccess: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: activations } = await supabase
        .from("device_activations")
        .select("id")
        .eq("device_id", deviceId)
        .eq("is_revoked", false)
        .limit(1);

      const hasAccess = activations && activations.length > 0;
      console.log(`[validate-code] Device ${deviceId.substring(0, 8)} hasAccess: ${hasAccess}`);
      return new Response(JSON.stringify({ hasAccess }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "redeem") {
      if (!code || !deviceId) {
        return new Response(
          JSON.stringify({ success: false, message: "Kod och enhets-ID krävs" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      console.log(`[validate-code] Device ${deviceId.substring(0, 8)} redeemed code successfully`);
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
