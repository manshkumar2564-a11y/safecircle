import { useEffect, useRef, useState } from 'react';
import { supabase, type Report } from '@/lib/supabase';
import {
  getCurrentPosition,
  googleMapsLink,
  distanceKm,
  type Coords,
} from '@/lib/geolocation';
import { analyzeRoute, type RouteAnalysisResponse } from '@/lib/ai';
import { useToast } from '@/components/Toast';
import LeafletMap, { type MapMarker } from '@/components/LeafletMap';
import {
  Search,
  MapPin,
  AlertTriangle,
  Loader2,
  Navigation,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Lightbulb,
  Footprints,
  Eye,
  Car,
} from 'lucide-react';

type Props = {
  onReportSubmitted: () => void;
};

export default function RouteView({ onReportSubmitted }: Props) {
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [analysis, setAnalysis] = useState<RouteAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapCenterRef = useRef<[number, number]>([40.7128, -74.006]);
  const { showToast } = useToast();

  // Load user location and reports
  useEffect(() => {
    (async () => {
      setLocating(true);
      try {
        const pos = await getCurrentPosition();
        setUserCoords(pos);
        setStartCoords({ lat: pos.latitude, lon: pos.longitude });
        setStartLabel('My current location');
        mapCenterRef.current = [pos.latitude, pos.longitude];
      } catch {
        showToast('info', 'Allow location access for better route analysis');
      }
      setLocating(false);
    })();

    loadReports();
  }, [showToast]);

  async function loadReports() {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (data) setReports(data as Report[]);
  }

  // Build map markers
  const markers: MapMarker[] = [];
  if (startCoords) {
    markers.push({
      id: 'start',
      lat: startCoords.lat,
      lon: startCoords.lon,
      popup: `Start: ${startLabel}`,
      color: 'green',
    });
  }
  if (endCoords) {
    markers.push({
      id: 'end',
      lat: endCoords.lat,
      lon: endCoords.lon,
      popup: `Destination: ${endLabel}`,
      color: 'red',
    });
  }
  for (const r of reports) {
    markers.push({
      id: r.id,
      lat: r.latitude,
      lon: r.longitude,
      popup: `<strong>${r.category}</strong> (${r.severity})<br/>${r.description}`,
      color: r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'amber' : 'blue',
    });
  }

  // Route line (straight line between start and end for visualization)
  const routeLine: [number, number][] | null =
    startCoords && endCoords
      ? [
          [startCoords.lat, startCoords.lon],
          [endCoords.lat, endCoords.lon],
        ]
      : null;

  function handleMapClick(lat: number, lon: number) {
    if (picking === 'start') {
      setStartCoords({ lat, lon });
      setStartLabel(`Pinned location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
      setPicking(null);
    } else if (picking === 'end') {
      setEndCoords({ lat, lon });
      setEndLabel(`Pinned location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
      setPicking(null);
    }
  }

  function useMyLocationForStart() {
    if (userCoords) {
      setStartCoords({ lat: userCoords.latitude, lon: userCoords.longitude });
      setStartLabel('My current location');
    } else {
      showToast('info', 'Location not available');
    }
  }

  async function handleAnalyze() {
    if (!startCoords || !endCoords) {
      showToast('error', 'Set both a start and destination point');
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    // Find reports near the route (within 1km of the line)
    const nearbyReports = reports
      .map((r) => {
        const d = distanceToLine(
          r.latitude,
          r.longitude,
          startCoords.lat,
          startCoords.lon,
          endCoords.lat,
          endCoords.lon
        );
        return { report: r, distance_km: d };
      })
      .filter((x) => x.distance_km < 1.0)
      .sort((a, b) => a.distance_km - b.distance_km);

    try {
      const result = await analyzeRoute({
        startLat: startCoords.lat,
        startLon: startCoords.lon,
        endLat: endCoords.lat,
        endLon: endCoords.lon,
        startLabel,
        endLabel,
        reports: nearbyReports.map((x) => ({
          category: x.report.category,
          description: x.report.description,
          severity: x.report.severity,
          distance_km: x.distance_km,
        })),
      });
      setAnalysis(result);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Route analysis failed');
    }
    setAnalyzing(false);
  }

  const riskConfig = {
    low: {
      icon: ShieldCheck,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      label: 'Low Risk',
    },
    moderate: {
      icon: Shield,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      label: 'Moderate Risk',
    },
    high: {
      icon: ShieldAlert,
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      label: 'High Risk',
    },
  };

  const risk = analysis ? riskConfig[analysis.risk_level] : null;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Route Safety Assistant</h1>
        <p className="text-sm text-stone-500 mt-1">
          Enter your route and get an AI-powered safety summary based on community reports.
        </p>
      </div>

      {/* Search inputs */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 space-y-4 mb-4">
        <div className="space-y-3">
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${
              picking === 'start'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-stone-200 bg-stone-50'
            }`}
            onClick={() => setPicking(picking === 'start' ? null : 'start')}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Navigation className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">From</p>
              <input
                type="text"
                value={startLabel}
                onChange={(e) => setStartLabel(e.target.value)}
                placeholder={picking === 'start' ? 'Click on map to set start' : 'Enter start or click map'}
                className="w-full bg-transparent text-stone-900 placeholder-stone-400 focus:outline-none text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                useMyLocationForStart();
              }}
              className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors flex-shrink-0"
            >
              My location
            </button>
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${
              picking === 'end'
                ? 'border-rose-500 bg-rose-50'
                : 'border-stone-200 bg-stone-50'
            }`}
            onClick={() => setPicking(picking === 'end' ? null : 'end')}
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">To</p>
              <input
                type="text"
                value={endLabel}
                onChange={(e) => setEndLabel(e.target.value)}
                placeholder={picking === 'end' ? 'Click on map to set destination' : 'Enter destination or click map'}
                className="w-full bg-transparent text-stone-900 placeholder-stone-400 focus:outline-none text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>

        {picking && (
          <div className="flex items-center gap-2 text-sm text-stone-500 bg-stone-100 rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4 animate-bounce" />
            Click on the map to set the {picking === 'start' ? 'start' : 'destination'} point
            <button
              onClick={() => setPicking(null)}
              className="ml-auto text-stone-400 hover:text-stone-600 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={analyzing || !startCoords || !endCoords}
          className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white font-semibold py-3.5 rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing route…
            </>
          ) : (
            <>
              <Search className="w-5 h-5" strokeWidth={2.5} />
              Analyze Route Safety
            </>
          )}
        </button>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm overflow-hidden mb-4">
        <LeafletMap
          center={mapCenterRef.current}
          zoom={14}
          markers={markers}
          userLocation={
            userCoords ? { lat: userCoords.latitude, lon: userCoords.longitude } : null
          }
          routeLine={routeLine}
          onMapClick={handleMapClick}
          fitToMarkers={markers.length > 0}
          className="w-full h-72 sm:h-80"
        />
        {locating && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur text-xs text-stone-600 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Finding your location…
          </div>
        )}
      </div>

      {/* AI Analysis result */}
      {analysis && risk && (
        <div
          className={`rounded-2xl border-2 ${risk.border} ${risk.bg} p-5 animate-[slideUp_300ms_ease-out]`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl ${risk.text} bg-white/60 flex items-center justify-center`}>
              <risk.icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${risk.text}`}>{risk.label}</h3>
                {analysis.ai_powered && (
                  <span className="flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    AI
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">Route safety analysis</p>
            </div>
          </div>

          <p className="text-sm text-stone-700 leading-relaxed mb-3">{analysis.summary}</p>

          <div className="bg-white/60 rounded-xl p-4 mb-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Recommendation
            </p>
            <p className="text-sm text-stone-700 leading-relaxed">{analysis.recommendation}</p>
          </div>

          {analysis.key_factors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Key factors
              </p>
              <ul className="space-y-1.5">
                {analysis.key_factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                    <AlertTriangle className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {startCoords && endCoords && (
            <a
              href={googleMapsLink(endCoords.lat, endCoords.lon)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-stone-700 bg-white/80 hover:bg-white rounded-xl py-2.5 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Open destination in Google Maps
            </a>
          )}
        </div>
      )}

      {/* Recent community reports near route */}
      {reports.length > 0 && !analysis && (
        <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">
            Community reports on this map
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reports.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-start gap-3 text-sm">
                <ReportIcon category={r.category} />
                <div className="flex-1 min-w-0">
                  <p className="text-stone-700 truncate">{r.description}</p>
                  <p className="text-xs text-stone-400">
                    {r.category} · {r.severity} severity
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Distance from a point to a line segment in km
function distanceToLine(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  // Convert to approximate km using lat/lon
  const axKm = ax * 111.32;
  const ayKm = ay * 111.32 * Math.cos((ay * Math.PI) / 180);
  const bxKm = bx * 111.32;
  const byKm = by * 111.32 * Math.cos((by * Math.PI) / 180);
  const pxKm = px * 111.32;
  const pyKm = py * 111.32 * Math.cos((py * Math.PI) / 180);

  const dx = bxKm - axKm;
  const dy = byKm - ayKm;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distanceKm(px, py, ax, ay);

  let t = ((pxKm - axKm) * dx + (pyKm - ayKm) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = axKm + t * dx;
  const projY = ayKm + t * dy;
  return Math.sqrt((pxKm - projX) ** 2 + (pyKm - projY) ** 2);
}

function ReportIcon({ category }: { category: string }) {
  const icons: Record<string, typeof Lightbulb> = {
    lighting: Lightbulb,
    harassment: ShieldAlert,
    traffic: Car,
    suspicious: Eye,
    other: AlertTriangle,
  };
  const colors: Record<string, string> = {
    lighting: 'text-amber-500',
    harassment: 'text-rose-500',
    traffic: 'text-sky-500',
    suspicious: 'text-violet-500',
    other: 'text-stone-400',
  };
  const Icon = icons[category] ?? AlertTriangle;
  return <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${colors[category] ?? 'text-stone-400'}`} />;
}
