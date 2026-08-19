/*
# SafeCircle — safety companion tables (single-tenant, no auth)

## Overview
Tables to support a personal safety web app: trusted contacts, SOS alerts,
scheduled check-ins ("Walk Me Home"), and community safety reports.

## New Tables

### contacts
- `id` (uuid, pk)
- `name` (text) — display name of the trusted contact
- `phone` (text) — phone number for alerts
- `email` (text, nullable) — optional email for alerts
- `relationship` (text) — e.g. "Mom", "Roommate", "Partner"
- `is_primary` (boolean, default false)
- `created_at` (timestamptz)

### checkins
- `id` (uuid, pk)
- `label` (text) — e.g. "Walking home from library"
- `duration_minutes` (integer)
- `status` (text) — 'active' | 'safe' | 'expired'
- `latitude`, `longitude` (double precision, nullable)
- `location_label` (text, nullable)
- `started_at`, `expires_at` (timestamptz)
- `resolved_at` (timestamptz, nullable)

### alerts
- `id` (uuid, pk)
- `type` (text) — 'sos' | 'checkin_expired' | 'checkin_safe'
- `latitude`, `longitude` (double precision, nullable)
- `location_label` (text, nullable)
- `message` (text) — alert message body
- `status` (text) — 'active' | 'cancelled' | 'escalated'
- `contacts_notified` (text[]) — names of contacts notified
- `checkin_id` (uuid, nullable, fk to checkins)
- `created_at` (timestamptz)

### reports
- `id` (uuid, pk)
- `category` (text) — 'lighting' | 'harassment' | 'traffic' | 'suspicious' | 'other'
- `description` (text)
- `severity` (text) — 'low' | 'medium' | 'high' — set by AI triage
- `ai_summary` (text, nullable)
- `latitude`, `longitude` (double precision)
- `location_label` (text, nullable)
- `status` (text) — 'active' | 'resolved'
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables. Single-tenant, no sign-in: anon + authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  relationship text NOT NULL DEFAULT 'Friend',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_contacts" ON contacts;
CREATE POLICY "anon_select_contacts" ON contacts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contacts" ON contacts;
CREATE POLICY "anon_insert_contacts" ON contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contacts" ON contacts;
CREATE POLICY "anon_update_contacts" ON contacts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contacts" ON contacts;
CREATE POLICY "anon_delete_contacts" ON contacts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'active',
  latitude double precision,
  longitude double precision,
  location_label text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_checkins" ON checkins;
CREATE POLICY "anon_select_checkins" ON checkins FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_checkins" ON checkins;
CREATE POLICY "anon_insert_checkins" ON checkins FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_checkins" ON checkins;
CREATE POLICY "anon_update_checkins" ON checkins FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_checkins" ON checkins;
CREATE POLICY "anon_delete_checkins" ON checkins FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'sos',
  latitude double precision,
  longitude double precision,
  location_label text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  contacts_notified text[] NOT NULL DEFAULT '{}',
  checkin_id uuid REFERENCES checkins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  ai_summary text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location_label text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports" ON reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports" ON reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reports" ON reports;
CREATE POLICY "anon_update_reports" ON reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reports" ON reports;
CREATE POLICY "anon_delete_reports" ON reports FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS reports_location_idx ON reports (latitude, longitude);
CREATE INDEX IF NOT EXISTS alerts_created_at_idx ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS checkins_status_idx ON checkins (status);
