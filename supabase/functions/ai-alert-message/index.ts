const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

type RequestBody = {
  type: 'sos' | 'checkin_expired' | 'checkin_safe';
  userName?: string;
  locationLabel?: string;
  mapsLink?: string;
  context?: string;
  checkinDuration?: number;
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (ANTHROPIC_API_KEY) {
      const prompt = buildPrompt(body);
      const aiText = await callClaude(ANTHROPIC_API_KEY, prompt);
      return jsonResponse({ message: aiText.trim(), ai_powered: true });
    }

    const message = ruleBasedMessage(body);
    return jsonResponse({ message, ai_powered: false });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      500
    );
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildPrompt(body: RequestBody): string {
  const name = body.userName ?? 'Your contact';
  const loc = body.locationLabel ?? 'unknown location';
  const link = body.mapsLink ?? '';
  const ctx = body.context ?? '';

  const situations: Record<string, string> = {
    sos: `${name} has triggered an emergency SOS alert.`,
    checkin_expired: `${name} started a check-in timer (${body.checkinDuration ?? 20} min)${ctx ? ` for: ${ctx}` : ''} and did not confirm they are safe before the timer ended.`,
    checkin_safe: `${name} has confirmed they are safe.${ctx ? ` Context: ${ctx}` : ''}`,
  };

  return `You are a safety alert message generator. Write a concise, clear alert message that a trusted contact would receive.

Situation: ${situations[body.type] ?? situations.sos}
Location: ${loc}
Maps link: ${link}

Write ONLY the message text (no JSON, no formatting). Keep it under 2 sentences. Be calm but clear about what happened and what the recipient should do. Include the maps link if provided.`;
}

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty Claude response');
  return text;
}

function ruleBasedMessage(body: RequestBody): string {
  const name = body.userName ?? 'I';
  const loc = body.locationLabel ?? 'my current location';
  const link = body.mapsLink ?? '';
  const ctx = body.context ? ` (${body.context})` : '';

  switch (body.type) {
    case 'sos':
      return `${name} may need help. Here is ${name === 'I' ? 'my' : 'their'} live location: ${loc}. ${link ? `Map: ${link}` : ''} Please try to reach ${name === 'I' ? 'me' : 'them'} or call emergency services if you cannot connect.`;
    case 'checkin_expired':
      return `${name} set a check-in timer${ctx} and did not confirm safe before it ended. Last known location: ${loc}. ${link ? `Map: ${link}` : ''} Please check in on ${name === 'I' ? 'me' : 'them'} now.`;
    case 'checkin_safe':
      return `${name} has confirmed they are safe.${ctx ? ` Context: ${ctx}` : ''} No action needed — just letting you know.`;
    default:
      return `${name} shared their location: ${loc}. ${link}`;
  }
}
