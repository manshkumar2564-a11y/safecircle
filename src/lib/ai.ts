// Utilities for calling SafeCircle edge functions.
// All functions live under /functions/v1/<slug>.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function callFunction<T>(
  slug: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${slug}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) detail = errBody.error;
    } catch {
      /* ignore parse error */
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return data as T;
}

// ---------------------------------------------------------------------------
// Route analysis
// ---------------------------------------------------------------------------
export type RouteAnalysisRequest = {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  startLabel?: string;
  endLabel?: string;
  reports: {
    category: string;
    description: string;
    severity: string;
    distance_km: number;
  }[];
};

export type RouteAnalysisResponse = {
  summary: string;
  risk_level: 'low' | 'moderate' | 'high';
  recommendation: string;
  key_factors: string[];
  ai_powered: boolean;
};

export async function analyzeRoute(
  req: RouteAnalysisRequest
): Promise<RouteAnalysisResponse> {
  return callFunction<RouteAnalysisResponse>('ai-route-analysis', {
    ...req,
  });
}

// ---------------------------------------------------------------------------
// Alert message generation
// ---------------------------------------------------------------------------
export type AlertMessageRequest = {
  type: 'sos' | 'checkin_expired' | 'checkin_safe';
  userName?: string;
  locationLabel?: string;
  mapsLink?: string;
  context?: string; // e.g. "Walking home from library"
  checkinDuration?: number;
};

export type AlertMessageResponse = {
  message: string;
  ai_powered: boolean;
};

export async function generateAlertMessage(
  req: AlertMessageRequest
): Promise<AlertMessageResponse> {
  return callFunction<AlertMessageResponse>('ai-alert-message', { ...req });
}

// ---------------------------------------------------------------------------
// Report triage
// ---------------------------------------------------------------------------
export type ReportTriageRequest = {
  category: string;
  description: string;
};

export type ReportTriageResponse = {
  severity: 'low' | 'medium' | 'high';
  summary: string;
  is_emergency: boolean;
  ai_powered: boolean;
};

export async function triageReport(
  req: ReportTriageRequest
): Promise<ReportTriageResponse> {
  return callFunction<ReportTriageResponse>('ai-report-triage', { ...req });
}
