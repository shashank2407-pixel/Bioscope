'use client';
import { Leaf, PawPrint } from 'lucide-react';
import type { Kind } from '@/lib/ecosystem';

interface KindToggleProps {
  value: Kind | '';
  onChange: (kind: Kind | '') => void;
  counts: { flora: number; fauna: number };
  /** Compact styling for use as an overlay on the globe. */
  compact?: boolean;
}

const OPTIONS = [
  { id: '', label: 'All', icon: null },
  { id: 'flora', label: 'Flora', icon: Leaf },
  { id: 'fauna', label: 'Fauna', icon: PawPrint },
] as const;

export default function KindToggle({ value, onChange, counts, compact = false }: KindToggleProps) {
  return (
    <div
      role="group"
      aria-label="Show flora or fauna"
      className={`inline-flex rounded-full border border-ink-500/70 p-1 ${compact ? 'bg-ink-900/85 backdrop-blur' : 'bg-ink-950/40'}`}
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        const count = id === '' ? counts.flora + counts.fauna : counts[id];
        return (
          <button
            key={id || 'all'}
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${
              compact ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
            } ${active ? 'bg-paper font-medium text-ink-900' : 'text-mist hover:text-paper'}`}
          >
            {Icon && <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />}
            {label}
            <span className={`font-mono ${active ? 'text-ink-600' : 'text-fog'} ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
