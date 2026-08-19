// Date helpers — all dates are handled as YYYY-MM-DD strings in local time.

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns array of 7 Dates starting from the Sunday of the given date's week
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// Returns the last N days ending today (inclusive), oldest first
export function lastNDays(n: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
}

// Returns a month grid (up to 42 cells) for the given year/month.
// Each cell is a Date or null for padding. Week starts on Sunday.
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

export function isToday(date: Date): boolean {
  return toISODate(date) === todayISO();
}

export function isFuture(date: Date): boolean {
  return toISODate(date) > todayISO();
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function shortWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Calculate current streak: consecutive days ending today (or yesterday) with a completion
export function calculateStreak(
  completions: Set<string>,
  today: string
): number {
  let streak = 0;
  let cursor = fromISODate(today);

  // Allow streak to count if today is done OR if today isn't done yet but yesterday was
  if (!completions.has(toISODate(cursor))) {
    cursor = addDays(cursor, -1);
  }

  while (completions.has(toISODate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
