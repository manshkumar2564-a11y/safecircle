import { useEffect, useState } from 'react';
import { supabase, type Report, type ReportCategory, type ReportSeverity } from '@/lib/supabase';
import { getCurrentPosition, type Coords } from '@/lib/geolocation';
import { triageReport } from '@/lib/ai';
import { useToast } from '@/components/Toast';
import LeafletMap, { type MapMarker } from '@/components/LeafletMap';
import {
  Plus,
  Lightbulb,
  ShieldAlert,
  Car,
  Eye,
  AlertTriangle,
  Loader2,
  Sparkles,
  X,
  Flag,
  ThumbsUp,
  MapPin,
} from 'lucide-react';

type Props = {
  onReportSubmitted: () => void;
};

const CATEGORIES: { key: ReportCategory; label: string; icon: typeof Lightbulb; color: string }[] = [
  { key: 'lighting', label: 'Poor Lighting', icon: Lightbulb, color: 'text-amber-500' },
  { key: 'harassment', label: 'Harassment', icon: ShieldAlert, color: 'text-rose-500' },
  { key: 'traffic', label: 'Traffic Hazard', icon: Car, color: 'text-sky-500' },
  { key: 'suspicious', label: 'Suspicious Activity', icon: Eye, color: 'text-violet-500' },
  { key: 'other', label: 'Other', icon: AlertTriangle, color: 'text-stone-500' },
];

const SEVERITY_STYLES: Record<ReportSeverity, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Low' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'High' },
};

export default function CommunityView({ onReportSubmitted }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const pos = await getCurrentPosition();
        setUserCoords(pos);
      } catch {
        /* map defaults to a center */
      }
      await loadReports();
      setLoading(false);
    })();
  }, []);

  async function loadReports() {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (data) setReports(data as Report[]);
  }

  const markers: MapMarker[] = reports.map((r) => ({
    id: r.id,
    lat: r.latitude,
    lon: r.longitude,
    popup: `<strong>${categoryLabel(r.category)}</strong><br/>${r.description}<br/><em>${r.severity} severity</em>`,
    color: r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'amber' : 'blue',
  }));

  const mapCenter: [number, number] = userCoords
    ? [userCoords.latitude, userCoords.longitude]
    : [40.7128, -74.006];

  async function resolveReport(id: string) {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', id);
    if (error) {
      showToast('error', 'Failed to resolve report');
      return;
    }
    showToast('success', 'Report marked as resolved');
    loadReports();
    onReportSubmitted();
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Community Reports</h1>
          <p className="text-sm text-stone-500 mt-1">
            Safety issues flagged by the community, visible to everyone on the map.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-stone-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-800 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Report
        </button>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm overflow-hidden mb-4 relative">
        <LeafletMap
          center={mapCenter}
          zoom={14}
          markers={markers}
          userLocation={
            userCoords ? { lat: userCoords.latitude, lon: userCoords.longitude } : null
          }
          fitToMarkers={markers.length > 0}
          className="w-full h-64 sm:h-80"
        />
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        )}
      </div>

      {/* Report list */}
      <div className="space-y-3">
        {reports.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-stone-200 p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 flex items-center justify-center mb-3">
              <Flag className="w-6 h-6 text-stone-400" />
            </div>
            <h3 className="font-semibold text-stone-700 mb-1">No reports yet</h3>
            <p className="text-sm text-stone-400">
              Be the first to flag a safety issue in your area.
            </p>
          </div>
        ) : (
          reports.map((r) => {
            const cat = CATEGORIES.find((c) => c.key === r.category);
            const sev = SEVERITY_STYLES[r.severity];
            return (
              <div
                key={r.id}
                className="group bg-white rounded-2xl p-4 border border-stone-200/70 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    {cat && <cat.icon className={`w-5 h-5 ${cat.color}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-stone-500">
                        {cat?.label ?? r.category}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                      {r.ai_summary && (
                        <span className="flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          AI triaged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-700 mt-1">{r.description}</p>
                    {r.ai_summary && (
                      <p className="text-xs text-stone-500 mt-1.5 italic bg-stone-50 rounded-lg px-3 py-2">
                        {r.ai_summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                      {r.location_label && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {r.location_label}
                        </span>
                      )}
                      <span>{timeAgo(r.created_at)}</span>
                      <button
                        onClick={() => resolveReport(r.id)}
                        className="flex items-center gap-1 text-stone-400 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Mark resolved
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ReportForm
          userCoords={userCoords}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            loadReports();
            onReportSubmitted();
          }}
        />
      )}
    </div>
  );
}

function ReportForm({
  userCoords,
  onClose,
  onSubmitted,
}: {
  userCoords: Coords | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory>('lighting');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(userCoords);
  const [pickingMap, setPickingMap] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || submitting) return;
    if (!coords) {
      showToast('error', 'Set a location for this report (allow GPS or tap the map)');
      return;
    }

    setSubmitting(true);

    // AI triage
    let severity: ReportSeverity = 'medium';
    let aiSummary: string | null = null;
    try {
      const res = await triageReport({ category, description: description.trim() });
      severity = res.severity;
      aiSummary = res.summary;
      if (res.is_emergency) {
        showToast('error', 'This report was flagged as a potential emergency — please also call local emergency services if needed.');
      }
    } catch {
      /* use defaults */
    }

    const locLabel = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

    const { error } = await supabase.from('reports').insert({
      category,
      description: description.trim(),
      severity,
      ai_summary: aiSummary,
      latitude: coords.latitude,
      longitude: coords.longitude,
      location_label: locLabel,
      status: 'active',
    });

    setSubmitting(false);
    if (error) {
      showToast('error', 'Failed to submit report');
      return;
    }
    showToast('success', 'Report submitted and added to the community map');
    onSubmitted();
  }

  const markers: MapMarker[] = coords
    ? [{ id: 'report-loc', lat: coords.latitude, lon: coords.longitude, color: 'red', popup: 'Report location' }]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-0 sm:p-4 animate-[fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-stone-900">New Safety Report</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    category === c.key
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <c.icon className={`w-4 h-4 ${category === c.key ? 'text-white' : c.color}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              What did you observe?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the safety issue — e.g. 'Streetlight has been out for a week, very dark at night'"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none text-sm"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Location
            </label>
            {coords ? (
              <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="text-sm text-stone-700 flex-1 truncate">
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={() => setPickingMap(!pickingMap)}
                  className="text-xs font-medium text-stone-500 hover:text-stone-700"
                >
                  {pickingMap ? 'Done' : 'Adjust'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const pos = await getCurrentPosition();
                      setCoords(pos);
                    } catch {
                      showToast('error', 'Could not get your location');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition-colors"
                >
                  Use my location
                </button>
                <button
                  type="button"
                  onClick={() => setPickingMap(true)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition-colors"
                >
                  Tap on map
                </button>
              </div>
            )}
            {pickingMap && (
              <div className="mt-3 rounded-xl overflow-hidden border border-stone-200">
                <LeafletMap
                  center={
                    coords
                      ? [coords.latitude, coords.longitude]
                      : userCoords
                      ? [userCoords.latitude, userCoords.longitude]
                      : [40.7128, -74.006]
                  }
                  zoom={15}
                  markers={markers}
                  onMapClick={(lat, lon) => setCoords({ latitude: lat, longitude: lon })}
                  className="w-full h-48"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2.5">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            AI will triage this report to assess severity and flag emergencies.
          </div>

          <button
            type="submit"
            disabled={!description.trim() || submitting || !coords}
            className="w-full bg-stone-900 text-white font-semibold py-3.5 rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}

function categoryLabel(cat: string): string {
  return CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}
