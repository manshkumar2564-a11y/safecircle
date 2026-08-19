import { useEffect, useState } from 'react';
import { supabase, type Alert } from '@/lib/supabase';
import { googleMapsLink } from '@/lib/geolocation';
import {
  AlertTriangle,
  ShieldCheck,
  Clock,
  XCircle,
  MapPin,
  Users,
  Bell,
} from 'lucide-react';

type Props = {
  refreshKey: number;
};

export default function AlertsView({ refreshKey }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setAlerts(data ?? []);
      setLoading(false);
    })();
  }, [refreshKey]);

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Alert History</h1>
        <p className="text-sm text-stone-500 mt-1">
          A log of every alert sent — what was shared, when, and with whom.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-200 p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 flex items-center justify-center mb-3">
            <Bell className="w-6 h-6 text-stone-400" />
          </div>
          <h3 className="font-semibold text-stone-700 mb-1">No alerts yet</h3>
          <p className="text-sm text-stone-400">
            SOS alerts and check-in notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const config = {
    sos: {
      icon: AlertTriangle,
      bg: 'bg-rose-50',
      iconBg: 'bg-rose-500',
      label: 'SOS Alert',
    },
    checkin_expired: {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500',
      label: 'Check-in Expired',
    },
    checkin_safe: {
      icon: ShieldCheck,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-500',
      label: 'Safe Confirmed',
    },
  };
  const statusConfig = {
    active: { text: 'text-rose-600', icon: AlertTriangle, label: 'Active' },
    cancelled: { text: 'text-stone-400', icon: XCircle, label: 'Cancelled' },
    escalated: { text: 'text-rose-600', icon: AlertTriangle, label: 'Escalated' },
  };

  const cfg = config[alert.type] ?? config.sos;
  const sc = statusConfig[alert.status] ?? statusConfig.active;

  return (
    <div className={`rounded-2xl border border-stone-200/70 shadow-sm p-5 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
          <cfg.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-stone-900">{cfg.label}</h3>
            <span className={`flex items-center gap-1 text-xs font-medium ${sc.text}`}>
              <sc.icon className="w-3 h-3" />
              {sc.label}
            </span>
          </div>
          <p className="text-sm text-stone-700 mt-1.5 leading-relaxed">{alert.message}</p>

          {alert.latitude && alert.longitude && (
            <a
              href={googleMapsLink(alert.latitude, alert.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-sky-700 hover:text-sky-800 mt-2 font-medium"
            >
              <MapPin className="w-4 h-4" />
              {alert.location_label ?? 'View location on map'}
            </a>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(alert.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            {alert.contacts_notified.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {alert.contacts_notified.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
