'use client';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { Species } from '@/lib/ecosystem';

/** Two field notes drawn from the current results, one per species. */
function pickNotes(list: Species[]) {
  const picked: { species: Species; note: string }[] = [];
  for (const species of list) {
    const note = species.field_notes?.[0];
    if (note) picked.push({ species, note });
    if (picked.length === 2) break;
  }
  return picked;
}

export default function SearchHighlights({ speciesList, active }: { speciesList: Species[]; active: boolean }) {
  if (!active) return null;
  const notes = pickNotes(speciesList);
  if (notes.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {notes.map(({ species, note }) => (
        <Link
          key={species.id}
          href={`/species/${species.id}`}
          className="group flex gap-3 rounded-xl border border-tag/35 bg-tag/[0.07] p-4 transition-colors hover:border-tag/70"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-tag" aria-hidden />
          <span>
            <span className="block text-[15px] leading-relaxed text-paper">{note}</span>
            <span className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-fog group-hover:text-mist">
              {species.common_name} · {species.kind}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
