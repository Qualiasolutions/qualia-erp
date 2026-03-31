import { createClient } from '@/lib/supabase/server';

export const maxDuration = 15;

// ElevenLabs voice ID - Rachel (clear, professional female voice)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function POST(req: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response('TTS not configured', { status: 503 });
    }

    const { text, voiceId } = await req.json();

    if (!text?.trim()) {
      return new Response('No text provided', { status: 400 });
    }

    // Validate voiceId to prevent SSRF
    const safeVoiceId =
      voiceId && /^[a-zA-Z0-9]{10,30}$/.test(voiceId) ? voiceId : DEFAULT_VOICE_ID;

    // Limit text length to control costs
    const trimmedText = text.slice(0, 1000);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${safeVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: trimmedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', response.status, errorText);
      return new Response('TTS generation failed', { status: 502 });
    }

    // Stream the audio back
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS route error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
