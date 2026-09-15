'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_META, type Species } from '@/lib/ecosystem';

const ROW = 34;
const WIDTH = 900;
const SPECIES_X = 270;
const RESOURCE_X = 620;

type Hover = { kind: 'species' | 'resource'; key: string } | null;

export default function NetworkView({ speciesList }: { speciesList: Species[] }) {
  const router = useRouter();
  const [hover, setHover] = useState<Hover>(null);

  const graph = useMemo(() => {
    const resources = new Map<string, { key: string; label: string; ids: string[] }>();
    for (const s of speciesList) {
      for (const dep of s.dependencies ?? []) {
        const key = dep.trim().toLowerCase();
        const entry = resources.get(key) ?? { key, label: dep.trim(), ids: [] };
        if (!entry.ids.includes(s.id)) entry.ids.push(s.id);
        resources.set(key, entry);
      }
    }
    const resourceList = [...resources.values()].sort((a, b) => b.ids.length - a.ids.length || a.label.localeCompare(b.label));
    const resourceIndex = new Map(resourceList.map((r, i) => [r.key, i]));

    // Order species by the average position of their resources to reduce crossing lines.
    const weight = (s: Species) => {
      const idx = (s.dependencies ?? []).map((d) => resourceIndex.get(d.trim().toLowerCase()) ?? 0);
      return idx.length ? idx.reduce((a, b) => a + b, 0) / idx.length : Infinity;
    };
    const speciesOrdered = [...speciesList].sort((a, b) => weight(a) - weight(b));

    const rows = Math.max(speciesOrdered.length, resourceList.length);
    const height = rows * ROW + 40;
    const yFor = (i: number, n: number) => 20 + ROW / 2 + i * ROW + ((rows - n) * ROW) / 2;
    const speciesY = new Map(speciesOrdered.map((s, i) => [s.id, yFor(i, speciesOrdered.length)]));
    const resourceY = new Map(resourceList.map((r, i) => [r.key, yFor(i, resourceList.length)]));
    const links = resourceList.flatMap((r) => r.ids.map((id) => ({ id, key: r.key })));

    return { speciesOrdered, resourceList, speciesY, resourceY, links, height };
  }, [speciesList]);

  const linkActive = (l: { id: string; key: string }) =>
    hover ? (hover.kind === 'species' ? l.id === hover.key : l.key === hover.key) : false;
  const speciesActive = (id: string) =>
    hover ? (hover.kind === 'species' ? hover.key === id : graph.links.some((l) => l.key === hover.key && l.id === id)) : false;
  const resourceActive = (key: string) =>
    hover ? (hover.kind === 'resource' ? hover.key === key : graph.links.some((l) => l.id === hover.key && l.key === key)) : false;

  return (
    <div className="rounded-2xl border border-ink-600/70 bg-ink-800/40 p-5 sm:p-8">
      <div className="flex flex-col gap-2 border-b border-ink-600/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-3xl text-paper">Web of life</h3>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Species on the left, the foods and habitats they rely on at right. Yellow resources are shared, so losing one
            affects several species at once.
          </p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-fog">Hover to trace · click a species to open it</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${graph.height}`} className="min-w-[720px]" role="img" aria-label="Network of species and the resources they depend on">
          {graph.links.map((l) => {
            const y1 = graph.speciesY.get(l.id)!;
            const y2 = graph.resourceY.get(l.key)!;
            const mid = (SPECIES_X + RESOURCE_X) / 2;
            const active = linkActive(l);
            return (
              <path
                key={`${l.id}-${l.key}`}
                d={`M ${SPECIES_X + 8} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${RESOURCE_X - 8} ${y2}`}
                fill="none"
                stroke={active ? '#F2C14E' : '#A3BAC7'}
                strokeOpacity={active ? 0.95 : hover ? 0.06 : 0.22}
                strokeWidth={active ? 2 : 1.25}
                style={{ transition: 'stroke-opacity .2s' }}
              />
            );
          })}

          {graph.speciesOrdered.map((s) => {
            const y = graph.speciesY.get(s.id)!;
            const dim = hover && !speciesActive(s.id);
            return (
              <g
                key={s.id}
                role="link"
                tabIndex={0}
                aria-label={`${s.common_name}: open field guide page`}
                className="cursor-pointer outline-none"
                opacity={dim ? 0.3 : 1}
                onMouseEnter={() => setHover({ kind: 'species', key: s.id })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ kind: 'species', key: s.id })}
                onBlur={() => setHover(null)}
                onClick={() => router.push(`/species/${s.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/species/${s.id}`)}
              >
                <text x={SPECIES_X - 14} y={y + 5} textAnchor="end" fill="#E8F1F4" fontSize="15" fontFamily="var(--font-display)">
                  {s.common_name}
                </text>
                <circle cx={SPECIES_X} cy={y} r={6.5} fill={STATUS_META[s.status].color} stroke="#0A1F30" strokeWidth={2} />
              </g>
            );
          })}

          {graph.resourceList.map((r) => {
            const y = graph.resourceY.get(r.key)!;
            const shared = r.ids.length > 1;
            const dim = hover && !resourceActive(r.key);
            return (
              <g
                key={r.key}
                opacity={dim ? 0.3 : 1}
                onMouseEnter={() => setHover({ kind: 'resource', key: r.key })}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={RESOURCE_X - 5} y={y - 5} width={10} height={10} transform={`rotate(45 ${RESOURCE_X} ${y})`} fill={shared ? '#F2C14E' : '#7593A5'} />
                <text x={RESOURCE_X + 16} y={y + 5} fill={shared ? '#E8F1F4' : '#A3BAC7'} fontSize="14" fontFamily="var(--font-body)">
                  {r.label}
                  {shared && (
                    <tspan fill="#F2C14E" fontFamily="var(--font-mono)" fontSize="12">
                      {`  ×${r.ids.length}`}
                    </tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
