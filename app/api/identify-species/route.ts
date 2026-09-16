import { NextResponse } from 'next/server';
import { AIError, generateJson } from '@/lib/ai';
import { HABITATS, normalizeHabitat, normalizeStatus } from '@/lib/ecosystem';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGE_CHARS = 12_000_000; // ~9 MB of base64

const SYSTEM = `You are a field biologist identifying wildlife from photographs.
Identify the most prominent living organism (animal, plant or fungus) in the image as precisely as the photo allows: species level when visible features support it, otherwise genus or family, and lower the confidence accordingly.
Use the IUCN Red List category for the species (LC, NT, VU, EN, CR, EW, EX, DD). Use NE for domestic animals or species never assessed.
latitude/longitude: a representative point in the species' core wild range (for widespread species, pick a well-known stronghold).
If the image contains no identifiable organism (a person, object, drawing of nothing, blank image), set is_organism to false and explain briefly in rejection_reason.
Always fill common_name with the everyday English name.
kind: "flora" for plants, algae and fungi; "fauna" for animals.
Respond only with JSON matching this shape:
{"is_organism": boolean, "rejection_reason": string, "kind": "flora" | "fauna", "common_name": string, "scientific_name": string, "confidence": number 0-1,
 "description": string (2 sentences), "habitat": one of ${HABITATS.join(', ')}, "region": string (short native range),
 "status": string, "latitude": number, "longitude": number,
 "taxonomy": {"kingdom","phylum","class","order","family","genus"},
 "ecological_role": string (1 sentence), "dependencies": string[] (2-5 foods, plants or habitat features it relies on, short plural nouns),
 "field_notes": string[] (2 surprising, accurate facts, one sentence each),
 "visual_cues": string (the visible features that support the identification)}`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_organism: { type: 'BOOLEAN' },
    rejection_reason: { type: 'STRING' },
    kind: { type: 'STRING', enum: ['flora', 'fauna'] },
    common_name: { type: 'STRING' },
    scientific_name: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    description: { type: 'STRING' },
    habitat: { type: 'STRING', enum: [...HABITATS] },
    region: { type: 'STRING' },
    status: { type: 'STRING', enum: ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'] },
    latitude: { type: 'NUMBER' },
    longitude: { type: 'NUMBER' },
    taxonomy: {
      type: 'OBJECT',
      description: 'One rank name per field, e.g. class "Mammalia", order "Sirenia".',
      properties: {
        kingdom: { type: 'STRING' },
        phylum: { type: 'STRING' },
        class: { type: 'STRING' },
        order: { type: 'STRING' },
        family: { type: 'STRING' },
        genus: { type: 'STRING' },
      },
      required: ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'],
    },
    ecological_role: { type: 'STRING' },
    dependencies: { type: 'ARRAY', items: { type: 'STRING' } },
    field_notes: { type: 'ARRAY', items: { type: 'STRING' } },
    visual_cues: { type: 'STRING' },
  },
  required: [
    'is_organism', 'kind', 'common_name', 'scientific_name', 'confidence', 'description', 'habitat', 'region', 'status',
    'latitude', 'longitude', 'taxonomy', 'ecological_role', 'dependencies', 'field_notes',
  ],
  propertyOrdering: [
    'is_organism', 'rejection_reason', 'kind', 'visual_cues', 'common_name', 'scientific_name', 'confidence', 'description',
    'habitat', 'region', 'status', 'latitude', 'longitude', 'taxonomy', 'ecological_role', 'dependencies', 'field_notes',
  ],
};

type RawResult = Record<string, unknown> & { taxonomy?: Record<string, unknown> };

const str = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const strList = (v: unknown, max: number) =>
  Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean).slice(0, max) : [];
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export async function POST(req: Request) {
  let imageBase64: unknown;
  try {
    ({ imageBase64 } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Send JSON with an imageBase64 data URL.' }, { status: 400 });
  }

  if (typeof imageBase64 !== 'string' || !/^data:image\/[\w.+-]+;base64,/.test(imageBase64)) {
    return NextResponse.json({ error: 'The upload is not an image. Use a JPEG, PNG or WebP photo.' }, { status: 400 });
  }
  if (imageBase64.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: 'That photo is too large. Use one under 8 MB.' }, { status: 413 });
  }

  try {
    const { data, provider } = await generateJson<RawResult>({
      system: SYSTEM,
      prompt: 'Identify the organism in this photo.',
      imageDataUrl: imageBase64,
      schema: SCHEMA,
    });

    if (data.is_organism === false) {
      return NextResponse.json({
        identified: false,
        reason: str(data.rejection_reason, 'No animal or plant could be found in this photo.'),
        provider,
      });
    }

    const scientificName = str(data.scientific_name, 'Unidentified species');
    const commonName = str(data.common_name, scientificName);
    const tax = data.taxonomy ?? {};

    return NextResponse.json({
      identified: true,
      provider,
      species: {
        kind: data.kind === 'flora' ? 'flora' : 'fauna',
        common_name: commonName,
        scientific_name: scientificName,
        confidence: num(data.confidence, 0, 1, 0.5),
        description: str(data.description, `${commonName} (${scientificName}).`),
        habitat: normalizeHabitat(data.habitat),
        region: str(data.region, 'Unknown range'),
        status: normalizeStatus(data.status),
        latitude: num(data.latitude, -90, 90, 20),
        longitude: num(data.longitude, -180, 180, 78),
        taxonomy: {
          kingdom: str(tax.kingdom),
          phylum: str(tax.phylum),
          class: str(tax.class),
          order: str(tax.order),
          family: str(tax.family),
          genus: str(tax.genus),
        },
        ecological_role: str(data.ecological_role),
        dependencies: strList(data.dependencies, 5),
        field_notes: strList(data.field_notes, 3),
        visual_cues: str(data.visual_cues),
      },
    });
  } catch (err) {
    const details = err instanceof AIError ? err.details : [];
    const message = err instanceof AIError && details.length === 0 ? err.message : 'The identification service is unavailable right now. Try again in a moment.';
    return NextResponse.json({ error: message, details }, { status: err instanceof AIError && details.length === 0 ? 503 : 502 });
  }
}
