import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  relationship: string;
  is_primary: boolean;
  created_at: string;
};

export type AlertType = 'sos' | 'checkin_expired' | 'checkin_safe';
export type AlertStatus = 'active' | 'cancelled' | 'escalated';

export type Alert = {
  id: string;
  type: AlertType;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  message: string;
  status: AlertStatus;
  contacts_notified: string[];
  checkin_id: string | null;
  created_at: string;
};

export type CheckinStatus = 'active' | 'safe' | 'expired';

export type Checkin = {
  id: string;
  label: string;
  duration_minutes: number;
  status: CheckinStatus;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  started_at: string;
  expires_at: string;
  resolved_at: string | null;
};

export type ReportCategory =
  | 'lighting'
  | 'harassment'
  | 'traffic'
  | 'suspicious'
  | 'other';
export type ReportSeverity = 'low' | 'medium' | 'high';

export type Report = {
  id: string;
  category: ReportCategory;
  description: string;
  severity: ReportSeverity;
  ai_summary: string | null;
  latitude: number;
  longitude: number;
  location_label: string | null;
  status: 'active' | 'resolved';
  created_at: string;
};
