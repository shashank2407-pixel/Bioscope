'use client';
import { RotateCcw } from 'lucide-react';
import { STATUS_META, THREAT_SCALE, type StatusCode } from '@/lib/ecosystem';

interface CatalogFiltersProps {
  counts: Record<string, number>;
  status: StatusCode | '';
  onStatus: (s: StatusCode | '') => void;
  habitats: string[];
  habitat: string;
  onHabitat: (h: string) => void;
  regions: string[];
  region: string;
  onRegion: (r: string) => void;
  canReset: boolean;
  onReset: () => void;
}

export default function CatalogFilters(props: CatalogFiltersProps) {
  const { counts, status, onStatus, habitats, habitat, onHabitat, regions, region, onRegion, canReset, onReset } = props;

  const chip = (active: boolean) =>
    `chip ${active ? 'border-paper bg-paper font-medium text-ink-900' : 'border-ink-500 text-mist hover:border-mist hover:text-paper'}`;

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="eyebrow mb-3 flex w-full justify-between">
          <span>Red List category</span>
          <span className="hidden sm:inline">least → most threatened</span>
        </legend>
        <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-ink-600/80">
          {THREAT_SCALE.map((code, i) => {
            const active = status === code;
            const meta = STATUS_META[code];
            return (
              <button
                key={code}
                aria-pressed={active}
                onClick={() => onStatus(active ? '' : code)}
                className={`relative flex flex-col items-start gap-1 px-2.5 pb-3 pt-4 text-left transition-colors sm:px-4 ${
                  i > 0 ? 'border-l border-ink-600/80' : ''
                } ${active ? 'bg-ink-700' : 'bg-ink-900 hover:bg-ink-800'}`}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: meta.color, opacity: active || !status ? 1 : 0.3 }} />
                <span className="font-mono text-xs font-bold" style={{ color: meta.color }}>
                  {code}
                </span>
                <span className="font-display text-2xl leading-none text-paper sm:text-3xl">{counts[code] ?? 0}</span>
                <span className="hidden text-xs text-mist md:block">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">Habitat</span>
        <button className={chip(!habitat)} aria-pressed={!habitat} onClick={() => onHabitat('')}>
          All
        </button>
        {habitats.map((h) => (
          <button key={h} className={chip(habitat === h)} aria-pressed={habitat === h} onClick={() => onHabitat(habitat === h ? '' : h)}>
            {h}
          </button>
        ))}
        <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto">
          <label htmlFor="region-filter" className="sr-only">
            Region
          </label>
          <select
            id="region-filter"
            value={region}
            onChange={(e) => onRegion(e.target.value)}
            className="rounded-full border border-ink-500 bg-ink-900 px-3 py-1.5 text-sm text-paper focus:border-mist focus:outline-none"
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {canReset && (
            <button onClick={onReset} className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-paper">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
