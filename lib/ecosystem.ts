export type Kind = 'flora' | 'fauna';

export type StatusCode = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD' | 'NE';

export interface Taxonomy {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
}

export interface Species {
  id: string;
  /** flora = plants, fauna = animals. Drives the globe's flora/fauna toggle. */
  kind: Kind;
  scientific_name: string;
  common_name: string;
  description: string;
  image_url: string;
  image_credit?: string;
  habitat: string;
  region: string;
  status: StatusCode;
  latitude: number;
  longitude: number;
  taxonomy?: Taxonomy;
  ecological_role?: string;
  dependencies?: string[];
  /** Other names this species answers to, so dependency strings like "Fig trees" link to it. */
  aliases?: string[];
  field_notes?: string[];
  /** Present on species created by the field scanner. */
  source?: 'catalog' | 'scan';
  confidence?: number;
  identified_by?: string;
  scanned_at?: string;
}

export const STATUS_META: Record<StatusCode, { label: string; color: string }> = {
  LC: { label: 'Least Concern', color: '#5FB49C' },
  NT: { label: 'Near Threatened', color: '#A7C957' },
  VU: { label: 'Vulnerable', color: '#E9C46A' },
  EN: { label: 'Endangered', color: '#F08A4B' },
  CR: { label: 'Critically Endangered', color: '#E5484D' },
  EW: { label: 'Extinct in the Wild', color: '#B08BBB' },
  EX: { label: 'Extinct', color: '#8B8FA3' },
  DD: { label: 'Data Deficient', color: '#7F97A6' },
  NE: { label: 'Not Evaluated', color: '#7F97A6' },
};

/** The ordered part of the Red List scale, least to most threatened. */
export const THREAT_SCALE: StatusCode[] = ['LC', 'NT', 'VU', 'EN', 'CR'];

export const HABITATS = ['Forest', 'Grassland', 'Wetland', 'Marine', 'Mountain', 'Desert', 'Urban'] as const;

export function normalizeStatus(input: unknown): StatusCode {
  const code = String(input ?? '').trim().toUpperCase();
  if (code in STATUS_META) return code as StatusCode;
  const byLabel = (Object.keys(STATUS_META) as StatusCode[]).find(
    (k) => STATUS_META[k].label.toUpperCase() === code
  );
  return byLabel ?? 'NE';
}

export function normalizeHabitat(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) return 'Unknown';
  if (/himalaya|mountain|alpine/i.test(raw)) return 'Mountain';
  const match = HABITATS.find((h) => h.toLowerCase() === raw.toLowerCase());
  return match ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

const norm = (s: string) => s.trim().toLowerCase();

export interface AffectedSpecies {
  species: Species;
  reasons: string[];
}

/** Every name a species answers to, normalised. */
export function namesOf(s: Species): string[] {
  return [s.common_name, ...(s.aliases ?? [])].map(norm);
}

/**
 * Species that would feel the loss of `target`: those sharing a food or habitat
 * resource with it, those it names as a dependency, and neighbours in the same
 * habitat and region.
 */
export function findAffected(target: Species, list: Species[]): AffectedSpecies[] {
  const targetDeps = new Set((target.dependencies ?? []).map(norm));
  const targetNames = new Set(namesOf(target));

  return list
    .filter((s) => s.id !== target.id && norm(s.scientific_name) !== norm(target.scientific_name))
    .map((s) => {
      const reasons: string[] = [];
      const shared = (s.dependencies ?? []).filter((d) => targetDeps.has(norm(d)));
      if (shared.length) reasons.push(`Shares ${shared.join(', ')}`);
      if (namesOf(s).some((n) => targetDeps.has(n))) reasons.push(`${target.common_name} depends on it`);
      if ((s.dependencies ?? []).some((d) => targetNames.has(norm(d)))) reasons.push(`Depends on ${target.common_name}`);
      if (norm(s.habitat) === norm(target.habitat) && norm(s.region) === norm(target.region)) {
        reasons.push(`Same ${s.habitat.toLowerCase()} in ${s.region}`);
      }
      return { species: s, reasons };
    })
    .filter((a) => a.reasons.length > 0);
}
