import { useEffect, useState } from 'react';
import { X, MapPin, Send, AlertTriangle } from 'lucide-react';

type SOSOverlayProps = {
  onCancel: () => void;
  onConfirm: (silent: boolean) => void;
  locationLabel: string | null;
  contactsCount: number;
};

// 5-second countdown before the SOS is sent, giving the user a chance to cancel
export default function SOSOverlay({
  onCancel,
  onConfirm,
  locationLabel,
  contactsCount,
}: SOSOverlayProps) {
  const [countdown, setCountdown] = useState(5);
  const [silent, setSilent] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      onConfirm(silent);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, silent, onConfirm]);

  return (
    <div className="fixed inset-0 z-[90] bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-[slideUp_200ms_ease-out]">
        {/* Pulsing alert header */}
        <div className="relative bg-rose-600 px-6 pt-8 pb-6 text-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-rose-500/40 animate-[pulseRing_2s_ease-out_infinite]" />
          </div>
          <div className="relative">
            <AlertTriangle className="w-12 h-12 text-white mx-auto mb-2" strokeWidth={2.5} />
            <h2 className="text-xl font-bold text-white">Sending SOS Alert</h2>
            <p className="text-rose-100 text-sm mt-1">
              Notifying {contactsCount} {contactsCount === 1 ? 'contact' : 'contacts'} in{' '}
              <span className="font-bold text-white tabular-nums">{countdown}s</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {locationLabel && (
            <div className="flex items-center gap-2 text-sm text-stone-600 bg-stone-50 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </div>
          )}

          {/* Silent mode toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setSilent((s) => !s)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                silent ? 'bg-stone-900' : 'bg-stone-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  silent ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-stone-800">Silent mode</p>
              <p className="text-xs text-stone-400">No on-screen flash when sent</p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(silent)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" strokeWidth={2.5} />
              Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
