import { useCallback, useEffect, useState } from 'react';
import { supabase, type Contact, type Checkin } from '@/lib/supabase';
import { getCurrentPosition, googleMapsLink, formatCoords } from '@/lib/geolocation';
import { generateAlertMessage } from '@/lib/ai';
import { ToastProvider, useToast } from '@/components/Toast';
import SOSOverlay from '@/components/SOSOverlay';
import DashboardView from '@/views/DashboardView';
import ContactsView from '@/views/ContactsView';
import CheckInView from '@/views/CheckInView';
import RouteView from '@/views/RouteView';
import CommunityView from '@/views/CommunityView';
import AlertsView from '@/views/AlertsView';
import {
  Home,
  Users,
  Footprints,
  MapPin,
  Flag,
  Bell,
  Shield,
} from 'lucide-react';

type View = 'dashboard' | 'contacts' | 'checkin' | 'route' | 'community' | 'alerts';

type NavItem = { view: View; label: string; icon: typeof Home };

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Home', icon: Home },
  { view: 'checkin', label: 'Check-In', icon: Footprints },
  { view: 'route', label: 'Route', icon: MapPin },
  { view: 'community', label: 'Reports', icon: Flag },
  { view: 'contacts', label: 'Contacts', icon: Users },
  { view: 'alerts', label: 'Alerts', icon: Bell },
];

function SafeCircle() {
  const [view, setView] = useState<View>('dashboard');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeCheckin, setActiveCheckin] = useState<Checkin | null>(null);
  const [showSOS, setShowSOS] = useState(false);
  const [alertsRefreshKey, setAlertsRefreshKey] = useState(0);
  const { showToast } = useToast();

  // Load contacts + active check-in on mount and periodically
  const loadContacts = useCallback(async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setContacts(data as Contact[]);
  }, []);

  const loadActiveCheckin = useCallback(async () => {
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveCheckin((data as Checkin) ?? null);
  }, []);

  useEffect(() => {
    loadContacts();
    loadActiveCheckin();
    const interval = setInterval(loadActiveCheckin, 30000);
    return () => clearInterval(interval);
  }, [loadContacts, loadActiveCheckin]);

  // Keyboard shortcut: "s" key triggers SOS
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 's' && !showSOS && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        if (contacts.length > 0) setShowSOS(true);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSOS, contacts.length]);

  async function sendSOS(silent: boolean) {
    setShowSOS(false);

    let lat: number | null = null;
    let lon: number | null = null;
    let locLabel: string | null = null;
    try {
      const pos = await getCurrentPosition();
      lat = pos.latitude;
      lon = pos.longitude;
      locLabel = formatCoords(pos);
    } catch {
      showToast('error', 'Could not get your GPS location — alert sent without coordinates');
    }

    const mapsLink = lat && lon ? googleMapsLink(lat, lon) : '';

    let message = '';
    try {
      const res = await generateAlertMessage({
        type: 'sos',
        locationLabel: locLabel ?? 'unknown',
        mapsLink,
      });
      message = res.message;
    } catch {
      message = `I may need help. Here is my location: ${locLabel ?? 'unknown'}. ${mapsLink}`;
    }

    const contactNames = contacts.map((c) => c.name);

    const { error } = await supabase.from('alerts').insert({
      type: 'sos',
      latitude: lat,
      longitude: lon,
      location_label: locLabel,
      message,
      status: 'active',
      contacts_notified: contactNames,
    });

    if (error) {
      showToast('error', 'Failed to send SOS alert');
      return;
    }

    if (!silent) {
      showToast('success', `SOS sent — ${contacts.length} contacts notified with your location`);
    } else {
      showToast('info', 'Silent SOS sent');
    }
    setAlertsRefreshKey((k) => k + 1);
  }

  function navigate(v: View) {
    setView(v);
    loadActiveCheckin();
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-stone-50/90 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <h1 className="text-base font-bold tracking-tight text-stone-900 leading-none">
                SafeCircle
              </h1>
              <p className="text-[10px] text-stone-400 mt-0.5">Your safety companion</p>
            </div>
          </button>
          {/* Quick SOS in header */}
          {contacts.length > 0 && (
            <button
              onClick={() => setShowSOS(true)}
              className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-rose-700 active:scale-95 transition-all"
            >
              <Bell className="w-4 h-4" strokeWidth={2.5} />
              SOS
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24">
        {view === 'dashboard' && (
          <DashboardView
            contacts={contacts}
            activeCheckin={activeCheckin}
            onNavigate={navigate}
            onSOS={() => setShowSOS(true)}
          />
        )}
        {view === 'contacts' && (
          <ContactsView contacts={contacts} onContactsChanged={loadContacts} />
        )}
        {view === 'checkin' && (
          <CheckInView
            contacts={contacts}
            onAlertCreated={() => setAlertsRefreshKey((k) => k + 1)}
          />
        )}
        {view === 'route' && (
          <RouteView onReportSubmitted={() => setAlertsRefreshKey((k) => k + 1)} />
        )}
        {view === 'community' && (
          <CommunityView onReportSubmitted={() => setAlertsRefreshKey((k) => k + 1)} />
        )}
        {view === 'alerts' && <AlertsView refreshKey={alertsRefreshKey} />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-stone-200/70">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-2 safe-area-pb">
          {NAV_ITEMS.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => navigate(item.view)}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
                  active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <item.icon
                  className="w-5 h-5"
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* SOS overlay */}
      {showSOS && (
        <SOSOverlay
          onCancel={() => setShowSOS(false)}
          onConfirm={sendSOS}
          locationLabel={null}
          contactsCount={contacts.length}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SafeCircle />
    </ToastProvider>
  );
}
