const PALETTES = [
  'bg-blue-50 text-blue-700 border-blue-200/80',
  'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  'bg-amber-50 text-amber-700 border-amber-200/80',
  'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  'bg-teal-50 text-teal-700 border-teal-200/80',
  'bg-rose-50 text-rose-700 border-rose-200/80',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function UserMonogram({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const palette = PALETTES[hashName(name || 'U') % PALETTES.length];
  const initial = (name || '?').trim().slice(0, 1);
  const sizeCls =
    size === 'sm'
      ? 'h-6 w-6 text-[11px] rounded-md'
      : size === 'lg'
        ? 'h-9 w-9 text-sm rounded-lg'
        : 'h-7 w-7 text-xs rounded-md';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border font-display font-semibold ${sizeCls} ${palette}`}
    >
      {initial}
    </span>
  );
}
