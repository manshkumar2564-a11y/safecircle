import type { Contact, Checkin } from '@/lib/supabase';
import { googleMapsLink } from '@/lib/geolocation';
import {
  Shield,
  Siren,
  Footprints,
  Users,
  MapPin,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

type View = 'dashboard' | 'contacts' | 'checkin' | 'route' | 'community' | 'alerts';

type Props = {
  contacts: Contact[];
  activeCheckin: Checkin | null;
  onNavigate: (view: View) => void;
  onSOS: () => void;
};

export default function DashboardView({
  contacts,
  activeCheckin,
  onNavigate,
  onSOS,
}: Props) {
  const primaryContacts = contacts.filter((c) => c.is_primary);
  const hasContacts = contacts.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8 space-y-6">
      {/* Hero / status */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-3">
          <Shield className="w-3.5 h-3.5" strokeWidth={2.5} />
          SafeCircle Active
        </div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
          {greeting()}
        </h1>
        <p className="text-stone-500 mt-2 text-sm">
          {hasContacts
            ? `${contacts.length} trusted ${contacts.length === 1 ? 'contact' : 'contacts'} ready to be alerted`
            : 'Add trusted contacts to get started'}
        </p>
      </div>

      {/* SOS Button */}
      <div className="relative flex flex-col items-center py-4">
        <button
          onClick={onSOS}
          disabled={!hasContacts}
          className="relative w-36 h-36 rounded-full bg-rose-600 text-white flex flex-col items-center justify-center shadow-xl hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed animate-[sosPulse_3s_ease-in-out_infinite]"
        >
          <div className="absolute inset-0 rounded-full bg-rose-500 animate-[pulseRing_2.5s_ease-out_infinite]" />
          <Siren className="w-10 h-10 relative z-10" strokeWidth={2.5} />
          <span className="text-lg font-bold relative z-10 mt-1">SOS</span>
        </button>
        <p className="text-xs text-stone-400 mt-4 max-w-xs text-center">
          Press and hold to send an instant alert with your live location to all trusted contacts
        </p>
        {!hasContacts && (
          <button
            onClick={() => onNavigate('contacts')}
            className="mt-3 text-sm font-medium text-stone-900 underline hover:text-stone-700"
          >
            Set up contacts first
          </button>
        )}
      </div>

      {/* Active check-in status */}
      {activeCheckin && (
        <button
          onClick={() => onNavigate('checkin')}
          className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-100 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Footprints className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Check-in active</p>
            <p className="text-xs text-amber-700 truncate">{activeCheckin.label}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-600 flex-shrink-0" />
        </button>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          icon={<Footprints className="w-5 h-5" strokeWidth={2.5} />}
          title="Walk Me Home"
          desc="Set a check-in timer"
          onClick={() => onNavigate('checkin')}
          color="bg-emerald-500"
        />
        <QuickAction
          icon={<MapPin className="w-5 h-5" strokeWidth={2.5} />}
          title="Route Safety"
          desc="Check a route"
          onClick={() => onNavigate('route')}
          color="bg-sky-500"
        />
        <QuickAction
          icon={<Users className="w-5 h-5" strokeWidth={2.5} />}
          title="Contacts"
          desc={`${contacts.length} trusted`}
          onClick={() => onNavigate('contacts')}
          color="bg-violet-500"
        />
        <QuickAction
          icon={<AlertCircle className="w-5 h-5" strokeWidth={2.5} />}
          title="Community"
          desc="Safety reports"
          onClick={() => onNavigate('community')}
          color="bg-amber-500"
        />
      </div>

      {/* Primary contacts summary */}
      {hasContacts && (
        <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-700">Your safety circle</h3>
            <button
              onClick={() => onNavigate('contacts')}
              className="text-xs font-medium text-stone-400 hover:text-stone-700"
            >
              Manage
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryContacts.length > 0 ? (
              primaryContacts.map((c) => (
                <span
                  key={c.id}
                  className="flex items-center gap-2 bg-stone-100 rounded-full pl-2 pr-3.5 py-1.5"
                >
                  <span className="w-7 h-7 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-stone-700">{c.name}</span>
                </span>
              ))
            ) : (
              contacts.slice(0, 3).map((c) => (
                <span
                  key={c.id}
                  className="flex items-center gap-2 bg-stone-100 rounded-full pl-2 pr-3.5 py-1.5"
                >
                  <span className="w-7 h-7 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-stone-700">{c.name}</span>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-3 bg-stone-100/60 rounded-2xl p-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-stone-700">Privacy-first</p>
          <p className="text-xs text-stone-500 mt-0.5">
            Your location is only shared with the contacts you choose, only when you trigger an alert or a check-in expires. You can see exactly what was sent in Alert History.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-4 flex flex-col items-start gap-3 hover:shadow-md hover:border-stone-300 transition-all active:scale-[0.97] text-left"
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-stone-900 text-sm">{title}</p>
        <p className="text-xs text-stone-400">{desc}</p>
      </div>
    </button>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
