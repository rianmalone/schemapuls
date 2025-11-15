const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('=== EDGE FUNCTION CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Attempting to read request body...');
    let body;
    let rawBodyLength = 0;
    try {
      const text = await req.text();
      rawBodyLength = text.length;
      console.log('Raw body length:', rawBodyLength);
      console.log('Raw body first 100 chars:', text.substring(0, 100));
      console.log('Raw body last 100 chars:', text.substring(Math.max(0, text.length - 100)));
      
      body = JSON.parse(text);
      console.log('Body parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: 'Failed to parse request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { imageBase64, imageLength } = body;
    console.log('imageBase64 present:', !!imageBase64);
    console.log('imageBase64 length:', imageBase64?.length || 0);
    console.log('Expected imageLength:', imageLength || 'not provided');
    
    if (imageLength && imageBase64?.length !== imageLength) {
      console.error(`TRUNCATION DETECTED: Expected ${imageLength} bytes, got ${imageBase64?.length} bytes`);
    }
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'missing_image', message: 'No image provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check payload size
    const sizeInBytes = (imageBase64.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    console.log(`Received image size: ${sizeInMB.toFixed(2)}MB`);
    
    if (sizeInMB > 2) {
      return new Response(
        JSON.stringify({ 
          error: 'image_too_large', 
          message: 'Bilden är för stor. Försök med en mindre bild eller lägre upplösning.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 413 }
      );
    }

    console.log('Analyzing schedule image with AI...');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `FIRST, verify if this is a school schedule/timetable image. If it's NOT a schedule (e.g., random photo, document, etc.), return: {"error": "invalid_image", "message": "Detta verkar inte vara ett schema. Vänligen ladda upp en bild av ditt skolschema."}

If it IS a schedule, analyze this Swedish school schedule image carefully. Extract ALL classes for each weekday (Monday-Friday).

CRITICAL VALIDATION:
- The image MUST show a weekly schedule with days and times
- If you cannot clearly see class names, times, or days, return: {"error": "incomplete_schedule", "message": "Schemat är inte komplett eller tydligt. Se till att hela schemat syns i bilden med alla lektioner, tider och dagar."}

CRITICAL INSTRUCTIONS FOR TIME PARSING:
- In each class box, the time in the TOP LEFT corner is the START time
- The time in the BOTTOM RIGHT corner is the END time
- Times are in HH:MM format (e.g., 08:00, 09:00, 10:00, etc.)
- Be VERY CAREFUL to read the correct start and end times from the image

For each class, extract:
1. name (exact name from the image)
2. start time (from TOP LEFT of class box)
3. end time (from BOTTOM RIGHT of class box)
4. room number (if visible)
5. which day it belongs to

Return a JSON object with this EXACT structure:
{
  "monday": [{"name": "Class Name", "start": "HH:MM", "end": "HH:MM", "room": "Room#", "color": "math"}],
  "tuesday": [...],
  "wednesday": [...],
  "thursday": [...],
  "friday": [...]
}

Use these color mappings:
- Math classes -> "science"
- Swedish -> "english"
- English -> "history"
- Entrepreneurship/Entreprenörskap -> "math"
- Sports/Idrott -> "art"
- Lunch -> "pe"
- Other subjects -> "art"

ONLY return the JSON, no other text.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'rate_limit',
            message: 'För många försök. Vänta en stund och försök igen.' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429,
          }
        );
      }
      
      // Return error with CORS headers instead of throwing
      return new Response(
        JSON.stringify({ 
          error: 'ai_api_error',
          message: `AI API fel: ${response.status} - ${errorText}` 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Extract JSON from the response
    let schedule;
    try {
      // Try to parse as JSON directly
      schedule = JSON.parse(content);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        schedule = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object in the text
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          schedule = JSON.parse(jsonObjectMatch[0]);
        } else {
          throw new Error('Could not extract JSON from AI response');
        }
      }
    }

    // Check if AI detected invalid image or incomplete schedule
    if (schedule.error) {
      return new Response(
        JSON.stringify(schedule),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Add IDs and ensure proper structure
    let idCounter = 1;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const processedSchedule: any = {};

    for (const day of days) {
      processedSchedule[day] = (schedule[day] || []).map((classItem: any) => ({
        id: (idCounter++).toString(),
        name: classItem.name || '',
        start: classItem.start || '',
        end: classItem.end || '',
        room: classItem.room || '',
        color: classItem.color || 'art'
      }));
    }

    console.log('Processed schedule:', JSON.stringify(processedSchedule, null, 2));

    return new Response(
      JSON.stringify({ schedule: processedSchedule }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in analyze-schedule:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'processing_error',
        message: 'Kunde inte analysera schemat. Försök igen och se till att bilden är tydlig och visar hela schemat.',
        details: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
