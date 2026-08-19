const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

type RequestBody = {
  category: string;
  description: string;
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
      const parsed = parseAIResponse(aiText);
      return jsonResponse({ ...parsed, ai_powered: true });
    }

    const result = ruleBasedTriage(body);
    return jsonResponse({ ...result, ai_powered: false });
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
  return `You are a safety report triage assistant. Analyze this community safety report and assess its severity.

Category: ${body.category}
Description: "${body.description}"

Respond in JSON format only:
{
  "severity": "low" | "medium" | "high",
  "summary": "1 sentence summary of the issue",
  "is_emergency": true | false
}

Guidelines:
- "high" = active threat, ongoing harassment, violence, or someone in immediate danger
- "medium" = concerning but not immediately dangerous (poor lighting, suspicious loitering)
- "low" = minor issues (broken streetlight, uneven pavement)
- "is_emergency": true if this indicates someone is in danger RIGHT NOW and needs immediate response`;
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
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty Claude response');
  return text;
}

function parseAIResponse(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        severity: (['low', 'medium', 'high'].includes(parsed.severity)
          ? parsed.severity
          : 'medium') as 'low' | 'medium' | 'high',
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Report triaged.',
        is_emergency: Boolean(parsed.is_emergency),
      };
    }
  } catch {
    /* fall through */
  }
  return { severity: 'medium' as const, summary: 'Report triaged.', is_emergency: false };
}

const HIGH_KEYWORDS = [
  'attack', 'assault', 'threat', 'weapon', 'knife', 'gun', 'chasing',
  'followed', 'grabbed', 'touched', 'danger', 'emergency', 'help',
  'scared', 'afraid', 'running', 'screaming', 'fight', 'hit', 'hurt',
  'blood', 'unconscious', 'rape', 'molest',
];

const MEDIUM_KEYWORDS = [
  'suspicious', 'loitering', 'staring', 'following', 'dark', 'drunk',
  'group', 'men', 'shouting', 'harass', 'catcall', 'comment',
];

function ruleBasedTriage(body: RequestBody) {
  const text = body.description.toLowerCase();
  const category = body.category;

  const hasHigh = HIGH_KEYWORDS.some((k) => text.includes(k));
  const hasMedium = MEDIUM_KEYWORDS.some((k) => text.includes(k));

  let severity: 'low' | 'medium' | 'high';
  let isEmergency: boolean;
  let summary: string;

  if (hasHigh || category === 'harassment') {
    severity = 'high';
    isEmergency = hasHigh;
    summary = hasHigh
      ? 'This report indicates a potentially active threat or safety emergency.'
      : 'Harassment report — could indicate an ongoing safety concern.';
  } else if (hasMedium || category === 'suspicious' || category === 'lighting') {
    severity = 'medium';
    isEmergency = false;
    summary =
      category === 'lighting'
        ? 'Poor lighting report — visibility concern for this area.'
        : 'Suspicious activity reported — warrants caution in this area.';
  } else {
    severity = 'low';
    isEmergency = false;
    summary = 'Minor safety concern reported for this location.';
  }

  return { severity, summary, is_emergency: isEmergency };
}
