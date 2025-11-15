const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  console.log("=== ANALYZE-SCHEDULE EDGE FUNCTION START ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- READ BODY ---
    const rawText = await req.text();
    console.log("Raw body length:", rawText.length);

    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return corsResponse({ error: "invalid_request", message: "Invalid JSON in request body." }, 400);
    }

    const { imageBase64 } = body;

    if (!imageBase64) {
      return corsResponse({ error: "missing_image", message: "No image provided." }, 400);
    }

    // Ensure base64 is a valid data URL
    const imageDataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;

    // --- SIZE CHECK ---
    const sizeInBytes = (imageBase64.length * 3) / 4;
    const sizeMB = sizeInBytes / (1024 * 1024);
    console.log(`Image size: ${sizeMB.toFixed(2)}MB`);

    if (sizeMB > 2) {
      return corsResponse(
        {
          error: "image_too_large",
          message: "Bilden är för stor. Försök med en mindre bild.",
        },
        413,
      );
    }

    // --- CALL AI ---
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return corsResponse({ error: "server_config", message: "API key missing on server" }, 500);
    }

    console.log("Calling Lovable AI…");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
FIRST, check if the image is a Swedish school schedule. 
If NOT a schedule, return:
{"error": "invalid_image", "message": "Detta verkar inte vara ett schema."}

If the schedule is incomplete or not readable:
{"error": "incomplete_schedule", "message": "Schemat är inte komplett eller tydligt."}

Extract:
- class name
- start time (top left)
- end time (bottom right)
- room
- weekday

Return EXACTLY this JSON format (no extra text):

{
  "monday": [...],
  "tuesday": [...],
  "wednesday": [...],
  "thursday": [...],
  "friday": [...]
}

Color mapping:
Math -> "science"
Swedish -> "english"
English -> "history"
Entreprenörskap -> "math"
Idrott -> "art"
Lunch -> "pe"
Other -> "art"
`,
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text();
      console.error("AI error:", aiRes.status, errTxt);

      return corsResponse({ error: "ai_api_error", message: errTxt }, aiRes.status);
    }

    const aiData = await aiRes.json();

    // --- PARSE CONTENT SAFE ---
    let content = aiData.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
      content = content.map((c: any) => c.text || "").join("");
    }

    if (typeof content !== "string") {
      return corsResponse({ error: "ai_format", message: "Unexpected AI response format." }, 500);
    }

    console.log("AI raw content:", content.slice(0, 200));

    // Extract JSON
    let schedule;
    try {
      schedule = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return corsResponse(
          {
            error: "json_extract_error",
            message: "Could not extract JSON from AI response.",
          },
          500,
        );
      }
      schedule = JSON.parse(match[0]);
    }

    if (schedule.error) {
      return corsResponse(schedule, 400);
    }

    // --- ADD IDs + CLEAN FINAL STRUCTURE ---
    const final: Record<string, any[]> = {};
    let id = 1;
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

    for (const d of days) {
      final[d] = (schedule[d] || []).map((c: any) => ({
        id: (id++).toString(),
        name: c.name || "",
        start: c.start || "",
        end: c.end || "",
        room: c.room || "",
        color: c.color || "art",
      }));
    }

    return corsResponse({ schedule: final }, 200);
  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    return corsResponse(
      {
        error: "server_error",
        message: "Kunde inte analysera schemat.",
        details: err?.message,
      },
      500,
    );
  }
});
