import { NextResponse } from 'next/server';
import { generateJson } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface CompactSpecies {
  id: string;
  common_name: string;
  scientific_name: string;
  habitat: string;
  region: string;
  status: string;
  class?: string;
  ecological_role?: string;
  dependencies?: string[];
}

const SYSTEM = `You filter a wildlife catalog for a natural-language query.
You receive the query and a JSON list of species. Return the ids of every species that genuinely matches, best match first.
Interpret intent: "big cats" means Felidae, "fish eaters" uses dependencies, "endangered" means EN, "threatened" means VU, EN or CR, "birds" means class Aves.
Return an empty list if nothing matches. Never invent ids.
Respond only with JSON: {"ids": string[], "summary": string (under 12 words, describes what was matched, e.g. "Species that rely on fig trees")}`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    ids: { type: 'ARRAY', items: { type: 'STRING' } },
    summary: { type: 'STRING' },
  },
  required: ['ids', 'summary'],
};

function keywordSearch(query: string, species: CompactSpecies[]) {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const ids = species
    .filter((s) => {
      const haystack = [s.common_name, s.scientific_name, s.habitat, s.region, s.status, s.class, s.ecological_role, ...(s.dependencies ?? [])]
        .join(' ')
        .toLowerCase();
      return terms.some((t) => haystack.includes(t));
    })
    .map((s) => s.id);
  return { ids, summary: `Keyword matches for “${query}”` };
}

export async function POST(req: Request) {
  let query = '';
  let species: CompactSpecies[] = [];
  try {
    const body = await req.json();
    query = String(body.query ?? '').trim().slice(0, 200);
    species = Array.isArray(body.species) ? body.species.slice(0, 200) : [];
  } catch {
    return NextResponse.json({ error: 'Send JSON with query and species.' }, { status: 400 });
  }

  if (query.length < 2 || species.length === 0) {
    return NextResponse.json({ ids: [], summary: '', provider: 'none' });
  }

  try {
    const { data, provider } = await generateJson<{ ids?: unknown; summary?: unknown }>({
      system: SYSTEM,
      prompt: `Query: ${query}\n\nCatalog:\n${JSON.stringify(species)}`,
      schema: SCHEMA,
      timeoutMs: 20_000,
    });
    const known = new Set(species.map((s) => s.id));
    const ids = Array.isArray(data.ids) ? data.ids.map(String).filter((id) => known.has(id)) : [];
    const summary = typeof data.summary === 'string' ? data.summary : '';
    return NextResponse.json({ ids, summary, provider });
  } catch {
    return NextResponse.json({ ...keywordSearch(query, species), provider: 'keyword' });
  }
}
