import type { Species } from './ecosystem';

export interface AskResult {
  ids: string[];
  summary: string;
  provider: string;
}

/** Asks the AI which catalog species match a plain-language query. */
export async function askCatalog(query: string, species: Species[]): Promise<AskResult> {
  const compact = species.map((s) => ({
    id: s.id,
    common_name: s.common_name,
    scientific_name: s.scientific_name,
    habitat: s.habitat,
    region: s.region,
    status: s.status,
    class: s.taxonomy?.class,
    ecological_role: s.ecological_role,
    dependencies: s.dependencies,
  }));

  const res = await fetch('/api/semantic-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, species: compact }),
  });
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status}).`);
  return res.json();
}
