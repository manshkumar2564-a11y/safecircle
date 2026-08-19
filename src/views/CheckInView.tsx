import { useEffect, useRef, useState } from 'react';
import { supabase, type Contact, type Checkin } from '@/lib/supabase';
import { getCurrentPosition, googleMapsLink, formatCoords } from '@/lib/geolocation';
import { generateAlertMessage } from '@/lib/ai';
import { useToast } from '@/components/Toast';
import {
  Play,
  ShieldCheck,
  Clock,
  MapPin,
  AlertTriangle,
  Timer,
  Footprints,
} from 'lucide-react';

type Props = {
  contacts: Contact[];
  onAlertCreated: () => void;
};

const QUICK_DURATIONS = [10, 15, 20, 30, 45, 60];

export default function CheckInView({ contacts, onAlertCreated }: Props) {
  const [label, setLabel] = useState('');
  const [duration, setDuration] = useState(20);
  const [customDuration, setCustomDuration] = useState('');
  const [activeCheckin, setActiveCheckin] = useState<Checkin | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [starting, setStarting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast } = useToast();

  // Load active check-in on mount
  useEffect(() => {
    loadActiveCheckin();
  }, []);

  async function loadActiveCheckin() {
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setActiveCheckin(data as Checkin);
      updateCountdown(data as Checkin);
    }
  }

  // Countdown timer
  useEffect(() => {
    if (!activeCheckin) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    updateCountdown(activeCheckin);
    intervalRef.current = setInterval(() => {
      updateCountdown(activeCheckin);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeCheckin]);

  function updateCountdown(checkin: Checkin) {
    const expires = new Date(checkin.expires_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expires - now) / 1000));
    setTimeLeft(remaining);
    if (remaining === 0 && checkin.status === 'active') {
      handleExpired(checkin);
    }
  }

  async function handleExpired(checkin: Checkin) {
    // Mark check-in as expired
    await supabase
      .from('checkins')
      .update({ status: 'expired', resolved_at: new Date().toISOString() })
      .eq('id', checkin.id);

    // Get current location for the alert
    let lat = checkin.latitude;
    let lon = checkin.longitude;
    try {
      const pos = await getCurrentPosition();
      lat = pos.latitude;
      lon = pos.longitude;
    } catch {
      /* use stored location */
    }

    const mapsLink = lat && lon ? googleMapsLink(lat, lon) : '';
    const locLabel = checkin.location_label || (lat && lon ? formatCoords({ latitude: lat, longitude: lon }) : 'unknown');

    // Generate AI alert message
    let message = '';
    try {
      const res = await generateAlertMessage({
        type: 'checkin_expired',
        locationLabel: locLabel,
        mapsLink,
        context: checkin.label,
        checkinDuration: checkin.duration_minutes,
      });
      message = res.message;
    } catch {
      message = `Check-in expired for "${checkin.label}". Last known location: ${locLabel}. Map: ${mapsLink}`;
    }

    const contactNames = contacts.map((c) => c.name);

    await supabase.from('alerts').insert({
      type: 'checkin_expired',
      latitude: lat,
      longitude: lon,
      location_label: locLabel,
      message,
      status: 'active',
      contacts_notified: contactNames,
      checkin_id: checkin.id,
    });

    setActiveCheckin(null);
    setTimeLeft(0);
    showToast('error', `Check-in expired! ${contacts.length} contacts notified with your location.`);
    onAlertCreated();
  }

  async function startCheckin() {
    if (contacts.length === 0) {
      showToast('error', 'Add trusted contacts first');
      return;
    }
    setStarting(true);

    let lat: number | null = null;
    let lon: number | null = null;
    try {
      const pos = await getCurrentPosition();
      lat = pos.latitude;
      lon = pos.longitude;
      setCoords({ lat, lon });
    } catch {
      showToast('info', 'Could not get GPS — alert will use last known location');
    }

    const mins = customDuration ? parseInt(customDuration) : duration;
    if (!mins || mins < 1) {
      showToast('error', 'Enter a valid duration');
      setStarting(false);
      return;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + mins * 60 * 1000);

    const { data, error } = await supabase
      .from('checkins')
      .insert({
        label: label.trim() || 'Walking home',
        duration_minutes: mins,
        status: 'active',
        latitude: lat,
        longitude: lon,
        location_label: lat && lon ? formatCoords({ latitude: lat, longitude: lon }) : null,
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      })
      .select()
      .single();

    setStarting(false);
    if (error) {
      showToast('error', 'Failed to start check-in');
      return;
    }

    setActiveCheckin(data as Checkin);
    setLabel('');
    setCustomDuration('');
    showToast('success', `Check-in started — we will check on you in ${mins} minutes`);
  }

  async function markSafe() {
    if (!activeCheckin) return;
    const { error } = await supabase
      .from('checkins')
      .update({ status: 'safe', resolved_at: new Date().toISOString() })
      .eq('id', activeCheckin.id);
    if (error) {
      showToast('error', 'Failed to mark safe');
      return;
    }

    // Send "safe" notification to contacts
    let message = '';
    try {
      const res = await generateAlertMessage({
        type: 'checkin_safe',
        context: activeCheckin.label,
      });
      message = res.message;
    } catch {
      message = 'I am safe. No action needed.';
    }

    await supabase.from('alerts').insert({
      type: 'checkin_safe',
      message,
      status: 'cancelled',
      contacts_notified: contacts.map((c) => c.name),
      checkin_id: activeCheckin.id,
    });

    setActiveCheckin(null);
    setTimeLeft(0);
    showToast('success', 'Marked safe — contacts notified you are OK');
    onAlertCreated();
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  const progress = activeCheckin
    ? (timeLeft / (activeCheckin.duration_minutes * 60)) * 100
    : 0;
  const isUrgent = timeLeft <= 60 && timeLeft > 0;

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Walk Me Home</h1>
        <p className="text-sm text-stone-500 mt-1">
          Set a timer before a solo walk or commute. If you do not confirm safe before
          it ends, your contacts are notified automatically.
        </p>
      </div>

      {activeCheckin ? (
        /* Active check-in view */
        <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden">
          <div
            className={`px-6 py-5 transition-colors ${
              isUrgent ? 'bg-amber-50' : 'bg-emerald-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              >
                <Footprints className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-500">Check-in active</p>
                <p className="font-semibold text-stone-900">{activeCheckin.label}</p>
              </div>
            </div>
            <div className="text-center py-4">
              <div
                className={`text-5xl font-bold tabular-nums tracking-tight ${
                  isUrgent ? 'text-amber-600' : 'text-stone-900'
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              <p className="text-xs text-stone-400 mt-1">time remaining</p>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {activeCheckin.latitude && activeCheckin.longitude && (
            <div className="px-6 py-3 flex items-center gap-2 text-sm text-stone-500 bg-stone-50 border-t border-stone-100">
              <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <span className="truncate">
                {activeCheckin.location_label || 'Location captured at start'}
              </span>
            </div>
          )}

          <div className="px-6 py-4">
            <button
              onClick={markSafe}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-4 rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-lg"
            >
              <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />
              I'm Safe
            </button>
            <p className="text-center text-xs text-stone-400 mt-3">
              Tap this button before the timer ends to let your contacts know you are OK.
            </p>
          </div>
        </div>
      ) : (
        /* Start a new check-in */
        <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              What are you doing?
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Walking home from library"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Check on me in
            </label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDuration(d);
                    setCustomDuration('');
                  }}
                  className={`py-3 rounded-xl font-semibold transition-all ${
                    !customDuration && duration === d
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Clock className="w-4 h-4 text-stone-400" />
              <input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="Custom minutes"
                min={1}
                max={180}
                className="flex-1 px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {contacts.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Add trusted contacts first so someone is notified.
            </div>
          )}

          <button
            onClick={startCheckin}
            disabled={starting}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white font-semibold py-4 rounded-2xl hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-40 text-lg"
          >
            {starting ? (
              <>
                <Timer className="w-5 h-5 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="w-5 h-5" fill="white" strokeWidth={0} />
                Start Check-In
              </>
            )}
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 bg-stone-100/60 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">How it works</h3>
        <ol className="space-y-2 text-sm text-stone-500">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-xs font-bold flex items-center justify-center">1</span>
            Set a label and how long until we should check on you.
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-xs font-bold flex items-center justify-center">2</span>
            Your GPS location is captured when you start the timer.
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-xs font-bold flex items-center justify-center">3</span>
            If you do not tap "I'm Safe" before time runs out, your contacts get an alert with your location.
          </li>
        </ol>
      </div>
    </div>
  );
}
