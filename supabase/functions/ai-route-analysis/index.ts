import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

type ReportInput = {
  category: string;
  description: string;
  severity: string;
  distance_km: number;
};

type RequestBody = {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  startLabel?: string;
  endLabel?: string;
  reports: ReportInput[];
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const distance = haversine(
      body.startLat,
      body.startLon,
      body.endLat,
      body.endLon
    );
    const nearby = body.reports.filter((r) => r.distance_km < 1.0);
    const highSeverity = nearby.filter((r) => r.severity === 'high');
    const medSeverity = nearby.filter((r) => r.severity === 'medium');

    if (ANTHROPIC_API_KEY) {
      const prompt = buildPrompt(body, distance, nearby);
      const aiText = await callClaude(ANTHROPIC_API_KEY, prompt);
      const parsed = parseAIResponse(aiText, nearby, highSeverity, medSeverity);
      return jsonResponse({ ...parsed, ai_powered: true });
    }

    // Rule-based fallback
    const result = ruleBasedAnalysis(
      distance,
      nearby,
      highSeverity,
      medSeverity,
      body
    );
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

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildPrompt(
  body: RequestBody,
  distance: number,
  nearby: ReportInput[]
): string {
  const reportLines = nearby.length
    ? nearby
        .map(
          (r) =>
            `- ${r.severity} severity ${r.category}: "${r.description}" (${r.distance_km.toFixed(2)}km from route)`
        )
        .join('\n')
    : 'No community reports near this route.';

  return `You are a personal safety assistant. Analyze a walking route and provide a safety summary.

Route: ${body.startLabel ?? `${body.startLat},${body.startLon}`} to ${body.endLabel ?? `${body.endLat},${body.endLon}`}
Distance: ${distance.toFixed(2)} km

Community reports near this route:
${reportLines}

Respond in JSON format only:
{
  "summary": "2-3 sentence plain-language overview of route safety",
  "risk_level": "low" | "moderate" | "high",
  "recommendation": "1-2 sentence actionable recommendation",
  "key_factors": ["factor 1", "factor 2", ...]
}`;
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
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty Claude response');
  return text;
}

function parseAIResponse(
  text: string,
  nearby: ReportInput[],
  high: ReportInput[],
  med: ReportInput[]
) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary ?? 'Route analyzed.',
        risk_level: parsed.risk_level ?? (high.length ? 'high' : 'moderate'),
        recommendation:
          parsed.recommendation ?? 'Stay aware of your surroundings.',
        key_factors: Array.isArray(parsed.key_factors)
          ? parsed.key_factors
          : [],
      };
    }
  } catch {
    /* fall through */
  }
  return ruleBasedFallback(nearby, high, med);
}

function ruleBasedFallback(
  nearby: ReportInput[],
  high: ReportInput[],
  med: ReportInput[]
) {
  const risk = high.length > 0 ? 'high' : med.length > 0 ? 'moderate' : 'low';
  return {
    summary:
      nearby.length > 0
        ? `${nearby.length} community report${nearby.length === 1 ? '' : 's'} found near this route.`
        : 'No community reports near this route.',
    risk_level: risk,
    recommendation:
      risk === 'high'
        ? 'Consider an alternative route or travel with a companion.'
        : 'Stay alert and keep your phone accessible.',
    key_factors: nearby.slice(0, 5).map((r) => `${r.category}: ${r.description}`),
  };
}

function ruleBasedAnalysis(
  distance: number,
  nearby: ReportInput[],
  high: ReportInput[],
  med: ReportInput[],
  body: RequestBody
) {
  const risk = high.length > 0 ? 'high' : med.length > 0 ? 'moderate' : 'low';

  const factors: string[] = [];
  if (high.length > 0)
    factors.push(`${high.length} high-severity report${high.length === 1 ? '' : 's'} along the route`);
  if (med.length > 0)
    factors.push(`${med.length} medium-severity report${med.length === 1 ? '' : 's'} nearby`);
  if (distance > 3) factors.push(`Long route (${distance.toFixed(1)} km) — consider transport for part of it`);
  if (nearby.filter((r) => r.category === 'lighting').length > 0)
    factors.push('Poor lighting reported on parts of this route');
  if (nearby.filter((r) => r.category === 'harassment').length > 0)
    factors.push('Harassment incidents reported along this route');

  const summary =
    nearby.length === 0
      ? `This ${distance.toFixed(1)} km route has no community safety reports. It appears relatively safe, but stay aware of your surroundings.`
      : risk === 'high'
      ? `This ${distance.toFixed(1)} km route has ${high.length} high-severity report${high.length === 1 ? '' : 's'} and ${nearby.length} total report${nearby.length === 1 ? '' : 's'} nearby. Exercise extra caution or choose an alternative.`
      : `This ${distance.toFixed(1)} km route has ${nearby.length} community report${nearby.length === 1 ? '' : 's'} nearby. No high-severity issues flagged, but stay alert.`;

  const recommendation =
    risk === 'high'
      ? 'Consider taking an alternative route, traveling with a companion, or using transport for part of the journey.'
      : risk === 'moderate'
      ? 'Stay on well-lit main streets, keep your phone charged, and share your live location with a trusted contact.'
      : 'This route looks reasonably safe. Still, let someone know you are on your way and keep your phone accessible.';

  return { summary, risk_level: risk, recommendation, key_factors: factors };
}
