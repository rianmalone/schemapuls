const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
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

    const systemPrompt = `You are a Swedish school schedule analyzer. Your task is to extract class information from school schedule images.

CRITICAL RULES:
1. First, verify this is actually a Swedish school schedule
2. If NOT a schedule, return: {"error": "invalid_image", "message": "Detta verkar inte vara ett schema."}
3. If incomplete or unreadable, return: {"error": "incomplete_schedule", "message": "Schemat är inte komplett eller tydligt."}
4. Extract ALL visible classes with complete information

For each class, extract:
- name: Subject name (e.g., "Matematik", "Svenska")
- start: Start time in HH:MM format (24-hour)
- end: End time in HH:MM format (24-hour)
- room: Room number or location (if visible)
- day: Weekday (monday, tuesday, wednesday, thursday, friday)

Subject to color mapping:
- "Matematik", "Entreprenörskap" → "math"
- "Svenska" → "english"
- "English", "Engelska" → "history"
- "Idrott" → "art"
- "Lunch" → "pe"
- Other subjects → "art"

Return ONLY valid JSON in this exact structure (no markdown, no extra text):
{
  "monday": [{"name": "Subject", "start": "08:00", "end": "09:30", "room": "A101", "color": "math"}],
  "tuesday": [...],
  "wednesday": [...],
  "thursday": [...],
  "friday": [...]
}

DO NOT include any other text, explanations, or markdown formatting.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this Swedish school schedule and extract all class information.",
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
      if (aiRes.status === 429) {
        return corsResponse(
          { error: "rate_limit", message: "För många förfrågningar. Försök igen om en stund." },
          429,
        );
      }
      if (aiRes.status === 402) {
        return corsResponse(
          { error: "payment_required", message: "Betalning krävs. Kontakta support." },
          402,
        );
      }
      const errTxt = await aiRes.text();
      console.error("AI API error:", aiRes.status, errTxt);

      return corsResponse({ error: "ai_api_error", message: "Kunde inte analysera schemat." }, 500);
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

    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Extract JSON
    let schedule;
    try {
      schedule = JSON.parse(content);
    } catch (parseError: any) {
      console.log("JSON parse failed, trying to extract JSON from text");
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Could not extract JSON from content:", content);
        return corsResponse(
          {
            error: "json_extract_error",
            message: "Could not extract JSON from AI response.",
            details: parseError?.message || "Unknown error"
          },
          500,
        );
      }
      try {
        schedule = JSON.parse(match[0]);
      } catch (secondParseError: any) {
        console.error("Second JSON parse also failed:", secondParseError?.message);
        console.error("Extracted content:", match[0]);
        return corsResponse(
          {
            error: "json_parse_error",
            message: "Kunde inte tolka AI-svaret.",
            details: secondParseError?.message || "Unknown error"
          },
          500,
        );
      }
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
