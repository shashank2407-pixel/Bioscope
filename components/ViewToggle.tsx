'use client';
import { LayoutGrid, Map as MapIcon, Waypoints } from 'lucide-react';

export type CatalogView = 'grid' | 'map' | 'web';

const VIEWS = [
  { id: 'grid', label: 'Catalog', icon: LayoutGrid },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'web', label: 'Web of life', icon: Waypoints },
] as const;

export default function ViewToggle({ value, onChange }: { value: CatalogView; onChange: (v: CatalogView) => void }) {
  return (
    <div role="tablist" aria-label="Catalog view" className="inline-flex rounded-full border border-ink-500/70 bg-ink-950/40 p-1">
      {VIEWS.map(({ id, label, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              active ? 'bg-paper font-medium text-ink-900' : 'text-mist hover:text-paper'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
