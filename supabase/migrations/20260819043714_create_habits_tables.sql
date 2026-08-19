/*
# Create habits and completions tables (single-tenant, no auth)

## Overview
A habit tracker that lets a user create habits, check them off each day,
track streaks, and visualize consistency on a weekly strip and monthly heatmap.

## New Tables

### habits
- `id` (uuid, primary key)
- `name` (text, not null) — the habit name, e.g. "Read 20 pages"
- `emoji` (text, not null, default '✨') — a short emoji shown next to the habit
- `color` (text, not null, default 'emerald') — accent color key used by the UI
- `target_per_week` (integer, not null, default 7) — how many days/week the habit is targeted
- `created_at` (timestamptz, default now())
- `archived` (boolean, not null, default false) — soft-archive a habit without losing history

### completions
- `id` (uuid, primary key)
- `habit_id` (uuid, references habits, cascade delete) — which habit was completed
- `completed_date` (date, not null) — the calendar day the habit was checked off
- `created_at` (timestamptz, default now())
- Unique constraint on (habit_id, completed_date) so a habit can only be marked done once per day

## Indexes
- `completions_habit_id_completed_date_idx` on (habit_id, completed_date desc) for fast lookups
- `completions_completed_date_idx` on (completed_date) for calendar-range queries

## Security
- RLS enabled on both tables.
- This is a single-tenant app with no sign-in, so all CRUD is allowed for
  anon + authenticated (the data is intentionally public/shared).
*/

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '✨',
  color text NOT NULL DEFAULT 'emerald',
  target_per_week integer NOT NULL DEFAULT 7 CHECK (target_per_week >= 1 AND target_per_week <= 7),
  created_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_habits" ON habits;
CREATE POLICY "anon_select_habits" ON habits FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_habits" ON habits;
CREATE POLICY "anon_insert_habits" ON habits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_habits" ON habits;
CREATE POLICY "anon_update_habits" ON habits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_habits" ON habits;
CREATE POLICY "anon_delete_habits" ON habits FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_completions" ON completions;
CREATE POLICY "anon_select_completions" ON completions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_completions" ON completions;
CREATE POLICY "anon_insert_completions" ON completions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_completions" ON completions;
CREATE POLICY "anon_update_completions" ON completions
  FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_completions" ON completions;
CREATE POLICY "anon_delete_completions" ON completions
  FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS completions_habit_id_completed_date_idx
  ON completions (habit_id, completed_date DESC);

CREATE INDEX IF NOT EXISTS completions_completed_date_idx
  ON completions (completed_date);
