import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image provided');
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
                text: `Analyze this Swedish school schedule image carefully. Extract ALL classes for each weekday (Monday-Friday).

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
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
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
