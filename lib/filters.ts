import type { Kind, Species, StatusCode } from './ecosystem';

export interface CatalogFilterState {
  query: string;
  /** '' shows flora and fauna together. */
  kind: Kind | '';
  habitat: string;
  region: string;
  status: StatusCode | '';
  /** Ranked ids returned by "Ask the guide"; overrides the plain text query while set. */
  aiIds: string[] | null;
}

export const EMPTY_FILTERS: CatalogFilterState = { query: '', kind: '', habitat: '', region: '', status: '', aiIds: null };

export function applyFilters(list: Species[], f: CatalogFilterState): Species[] {
  let result = list;
  if (f.kind) result = result.filter((s) => s.kind === f.kind);
  if (f.habitat) result = result.filter((s) => s.habitat === f.habitat);
  if (f.region) result = result.filter((s) => s.region === f.region);
  if (f.status) result = result.filter((s) => s.status === f.status);

  if (f.aiIds) {
    const rank = new Map(f.aiIds.map((id, i) => [id, i]));
    result = result.filter((s) => rank.has(s.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  } else if (f.query.trim()) {
    const q = f.query.trim().toLowerCase();
    result = result.filter((s) =>
      [s.common_name, s.scientific_name, s.region, s.habitat, ...(s.dependencies ?? [])].some((v) => v.toLowerCase().includes(q))
    );
  }
  return result;
}

export function isFiltered(f: CatalogFilterState) {
  return Boolean(f.query || f.kind || f.habitat || f.region || f.status || f.aiIds);
}

export function countByStatus(list: Species[]) {
  return list.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
}

export const uniqueSorted = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
