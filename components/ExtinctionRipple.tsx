'use client';
import { X } from 'lucide-react';
import type { AffectedSpecies, Species } from '@/lib/ecosystem';

interface ExtinctionRippleProps {
  target: Species | null;
  affected: AffectedSpecies[];
  onClose: () => void;
}

export default function ExtinctionRipple({ target, affected, onClose }: ExtinctionRippleProps) {
  if (!target) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-[#E5484D]/40 bg-ink-800/95 p-5 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow !text-[#F3A3A5]">Loss simulation</p>
        <button onClick={onClose} aria-label="End simulation" className="-m-1 rounded-full p-1 text-mist hover:text-paper">
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="mt-2 font-display text-2xl leading-tight text-paper">Without the {target.common_name}</h3>
      <p className="mt-2 text-sm text-mist">
        {affected.length
          ? `${affected.length} ${affected.length === 1 ? 'species' : 'species'} in this guide lose a shared food, habitat or partner.`
          : 'No other species in this guide share its food or habitat. Real ecosystems are far more connected than this catalog.'}
      </p>
      {affected.length > 0 && (
        <ul className="mt-4 max-h-48 space-y-2.5 overflow-y-auto pr-1">
          {affected.map(({ species, reasons }) => (
            <li key={species.id} className="text-sm">
              <span className="text-paper">{species.common_name}</span>
              <span className="block text-xs text-fog">{reasons.join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
      <button onClick={onClose} className="btn-ghost mt-5 w-full py-2">
        End simulation
      </button>
    </aside>
  );
}
