import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, code, device_id } = await req.json();
    console.log(`[validate-code] Action: ${action}, Device: ${device_id?.substring(0, 8)}...`);

    // CHECK ACCESS - verify if device is already activated and code is still active
    if (action === "check") {
      if (!device_id) {
        return new Response(
          JSON.stringify({ hasAccess: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if device has a non-revoked activation with an active code
      const { data: activations, error } = await supabase
        .from("device_activations")
        .select("id, code_id, is_revoked")
        .eq("device_id", device_id)
        .eq("is_revoked", false);

      if (error) {
        console.error("[validate-code] Check error:", error);
        throw error;
      }

      // Check if any non-revoked activation has an active code
      for (const activation of (activations || [])) {
        const { data: codeData } = await supabase
          .from("access_codes")
          .select("is_active")
          .eq("id", activation.code_id)
          .single();

        if (codeData?.is_active) {
          console.log(`[validate-code] Device ${device_id.substring(0, 8)} has active access`);
          return new Response(
            JSON.stringify({ hasAccess: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.log(`[validate-code] Device ${device_id.substring(0, 8)} has no active access`);
      return new Response(
        JSON.stringify({ hasAccess: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // REDEEM CODE - validate and activate
    if (action === "redeem") {
      if (!code || !device_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Kod och enhets-ID krävs" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Find the code first
      const { data: accessCode, error: codeError } = await supabase
        .from("access_codes")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (codeError) {
        console.error("[validate-code] Code lookup error:", codeError);
        throw codeError;
      }

      if (!accessCode) {
        console.log(`[validate-code] Invalid code attempted: ${code}`);
        return new Response(
          JSON.stringify({ success: false, error: "Tyvärr, fel kod" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if this device was revoked from THIS specific code
      const { data: revokedActivation } = await supabase
        .from("device_activations")
        .select("id")
        .eq("device_id", device_id)
        .eq("code_id", accessCode.id)
        .eq("is_revoked", true)
        .maybeSingle();

      if (revokedActivation) {
        console.log(`[validate-code] Device ${device_id.substring(0, 8)} is blocked from code ${code}`);
        return new Response(
          JSON.stringify({ success: false, error: "Tyvärr, fel kod" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if device already has a non-revoked activation for this code
      const { data: existingActivation } = await supabase
        .from("device_activations")
        .select("id")
        .eq("device_id", device_id)
        .eq("code_id", accessCode.id)
        .eq("is_revoked", false)
        .maybeSingle();

      if (existingActivation) {
        // Already activated with this code, just grant access
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check usage limit (null means infinite)
      if (accessCode.max_uses !== null && accessCode.current_uses >= accessCode.max_uses) {
        console.log(`[validate-code] Code ${code} has reached usage limit`);
        return new Response(
          JSON.stringify({ success: false, error: "Koden har nått sin användningsgräns" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Create activation
      const { error: activationError } = await supabase
        .from("device_activations")
        .insert({
          device_id: device_id,
          code_id: accessCode.id,
        });

      if (activationError) {
        console.error("[validate-code] Activation error:", activationError);
        throw activationError;
      }

      // Increment usage count
      const { error: updateError } = await supabase
        .from("access_codes")
        .update({ current_uses: accessCode.current_uses + 1 })
        .eq("id", accessCode.id);

      if (updateError) {
        console.error("[validate-code] Usage update error:", updateError);
      }

      console.log(`[validate-code] Device ${device_id.substring(0, 8)} activated with code ${code}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("[validate-code] Error:", error);
    return new Response(
      JSON.stringify({ error: "Ett fel uppstod. Försök igen." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
