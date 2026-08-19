// Color system for habit accents. Each key maps to a set of Tailwind classes.
// Used for the habit's checkbox, streak pill, and heatmap cells.

export type ColorKey =
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'teal'
  | 'orange';

export const COLOR_OPTIONS: { key: ColorKey; label: string; swatch: string }[] = [
  { key: 'emerald', label: 'Emerald', swatch: 'bg-emerald-500' },
  { key: 'sky', label: 'Sky', swatch: 'bg-sky-500' },
  { key: 'amber', label: 'Amber', swatch: 'bg-amber-500' },
  { key: 'rose', label: 'Rose', swatch: 'bg-rose-500' },
  { key: 'violet', label: 'Violet', swatch: 'bg-violet-500' },
  { key: 'teal', label: 'Teal', swatch: 'bg-teal-500' },
  { key: 'orange', label: 'Orange', swatch: 'bg-orange-500' },
];

export const COLOR_CLASSES: Record<
  ColorKey,
  {
    solid: string;
    solidHover: string;
    soft: string;
    text: string;
    ring: string;
    bar: string;
    dot: string;
    cellActive: string;
    cellBorder: string;
  }
> = {
  emerald: {
    solid: 'bg-emerald-500',
    solidHover: 'hover:bg-emerald-600',
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    cellActive: 'bg-emerald-500',
    cellBorder: 'ring-emerald-400',
  },
  sky: {
    solid: 'bg-sky-500',
    solidHover: 'hover:bg-sky-600',
    soft: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-200',
    bar: 'bg-sky-500',
    dot: 'bg-sky-500',
    cellActive: 'bg-sky-500',
    cellBorder: 'ring-sky-400',
  },
  amber: {
    solid: 'bg-amber-500',
    solidHover: 'hover:bg-amber-600',
    soft: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    cellActive: 'bg-amber-500',
    cellBorder: 'ring-amber-400',
  },
  rose: {
    solid: 'bg-rose-500',
    solidHover: 'hover:bg-rose-600',
    soft: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    cellActive: 'bg-rose-500',
    cellBorder: 'ring-rose-400',
  },
  violet: {
    solid: 'bg-violet-500',
    solidHover: 'hover:bg-violet-600',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200',
    bar: 'bg-violet-500',
    dot: 'bg-violet-500',
    cellActive: 'bg-violet-500',
    cellBorder: 'ring-violet-400',
  },
  teal: {
    solid: 'bg-teal-500',
    solidHover: 'hover:bg-teal-600',
    soft: 'bg-teal-50',
    text: 'text-teal-700',
    ring: 'ring-teal-200',
    bar: 'bg-teal-500',
    dot: 'bg-teal-500',
    cellActive: 'bg-teal-500',
    cellBorder: 'ring-teal-400',
  },
  orange: {
    solid: 'bg-orange-500',
    solidHover: 'hover:bg-orange-600',
    soft: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
    bar: 'bg-orange-500',
    dot: 'bg-orange-500',
    cellActive: 'bg-orange-500',
    cellBorder: 'ring-orange-400',
  },
};

export function colorClasses(key: string) {
  return COLOR_CLASSES[key as ColorKey] ?? COLOR_CLASSES.emerald;
}
