'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { findAffected } from '@/lib/ecosystem';
import { useCatalog } from '@/lib/useCatalog';
import Navbar from '@/components/Navbar';
import SpecimenPhoto from '@/components/SpecimenPhoto';
import StatusTag from '@/components/StatusTag';
import RedListScale from '@/components/RedListScale';
import LoadingState from '@/components/LoadingState';
import FieldScannerModal from '@/components/FieldScannerModal';

const PROVIDER_LABEL: Record<string, string> = { gemini: 'Gemini', openai: 'OpenAI' };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <dt className="eyebrow pt-1">{label}</dt>
      <dd className="text-[15px] leading-relaxed text-paper/90">{children}</dd>
    </div>
  );
}

export default function SpeciesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const { all, ready, removeScan } = useCatalog();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [developed, setDeveloped] = useState(false);

  const species = all.find((s) => s.id === id);
  const affected = useMemo(() => (species ? findAffected(species, all) : []), [species, all]);
  const byName = useMemo(() => new Map(all.map((s) => [s.common_name.toLowerCase(), s])), [all]);

  useEffect(() => {
    if (!species) return;
    document.title = `${species.common_name} — Keystone`;
    setDeveloped(false);
    const t = setTimeout(() => setDeveloped(true), 450);
    return () => clearTimeout(t);
  }, [species?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const nav = <Navbar onOpenScanner={() => setScannerOpen(true)} />;
  const scanner = <FieldScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />;

  if (!species) {
    return (
      <>
        {nav}
        {!ready ? (
          <LoadingState />
        ) : (
          <main className="mx-auto max-w-2xl px-5 py-24 text-center">
            <p className="eyebrow">Not in this guide</p>
            <h1 className="mt-4 font-display text-5xl font-light">We couldn’t find that species</h1>
            <p className="mt-4 text-mist">Scans are saved in the browser that made them, so a scan link won’t open on another device.</p>
            <Link href="/#catalog" className="btn-primary mt-8">
              Back to the catalog
            </Link>
          </main>
        )}
        {scanner}
      </>
    );
  }

  const tax = species.taxonomy ?? {};
  const ladder = (
    [
      ['Kingdom', tax.kingdom],
      ['Phylum', tax.phylum],
      ['Class', tax.class],
      ['Order', tax.order],
      ['Family', tax.family],
      ['Genus', tax.genus],
    ] as const
  ).filter(([, v]) => v);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { latitude: lat, longitude: lng } = species;
  const staticMap = token
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+f2c14e(${lng},${lat})/${lng},${lat},3.4,0/800x480@2x?access_token=${token}`
    : null;
  const isScan = species.source === 'scan';

  return (
    <>
      {nav}
      <main className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <Link href="/#catalog" className="mt-8 inline-flex items-center gap-2 text-sm text-mist hover:text-paper">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to catalog
        </Link>

        <section className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <figure className="self-start bg-paper p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)] sm:p-4 lg:sticky lg:top-24">
            <SpecimenPhoto src={species.image_url} alt={species.common_name} develop={developed ? 'always' : 'never'} className="aspect-[4/5] w-full" priority />
            <figcaption className="flex justify-between gap-3 pt-3 font-mono text-[11px] text-ink-600">
              <span>
                {lat.toFixed(2)}°, {lng.toFixed(2)}°
              </span>
              {isScan ? (
                <span>Your photo{species.scanned_at ? ` · ${new Date(species.scanned_at).toLocaleDateString()}` : ''}</span>
              ) : species.image_credit ? (
                <a href={species.image_credit} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Photo: Wikimedia Commons
                </a>
              ) : null}
            </figcaption>
          </figure>

          <div>
            <p className="eyebrow">
              {species.habitat} · {species.region}
            </p>
            <h1 className="mt-4 font-display text-5xl font-light leading-[0.98] tracking-[-0.02em] text-paper sm:text-7xl">{species.common_name}</h1>
            <p className="mt-2 font-display text-2xl italic text-mist">{species.scientific_name}</p>
            {isScan && (
              <p className="mt-5 inline-flex rounded-full bg-ink-800 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-mist">
                Identified by {PROVIDER_LABEL[species.identified_by ?? ''] ?? 'AI'}
                {species.confidence !== undefined && ` · ${Math.round(species.confidence * 100)}% match`}
              </p>
            )}

            <div className="mt-8">
              <RedListScale status={species.status} />
            </div>

            <p className="mt-8 text-lg leading-relaxed text-paper/90">{species.description}</p>

            <dl className="mt-10 divide-y divide-ink-600/70 border-y border-ink-600/70">
              {species.ecological_role && <Row label="Role">{species.ecological_role}</Row>}
              {!!species.dependencies?.length && (
                <Row label="Depends on">
                  <ul className="flex flex-wrap gap-1.5">
                    {species.dependencies.map((dep) => {
                      const match = byName.get(dep.toLowerCase());
                      return (
                        <li key={dep}>
                          {match ? (
                            <Link href={`/species/${match.id}`} className="chip inline-block border-tag/60 text-paper hover:bg-ink-800">
                              {dep} →
                            </Link>
                          ) : (
                            <span className="chip inline-block border-ink-500 text-mist">{dep}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Row>
              )}
              {ladder.length > 0 && (
                <Row label="Classification">
                  <ol className="flex flex-wrap gap-x-5 gap-y-3">
                    {ladder.map(([rank, value]) => (
                      <li key={rank}>
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-fog">{rank}</span>
                        <span className="text-sm">{value}</span>
                      </li>
                    ))}
                    <li>
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-fog">Species</span>
                      <span className="font-display text-base italic">{species.scientific_name}</span>
                    </li>
                  </ol>
                </Row>
              )}
              {!!species.field_notes?.length && (
                <Row label="Field notes">
                  <ul className="space-y-2">
                    {species.field_notes.map((note) => (
                      <li key={note} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-tag">
                        {note}
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
            </dl>

            {isScan && (
              <button
                onClick={() => {
                  removeScan(species.id);
                  router.push('/');
                }}
                className="mt-6 inline-flex items-center gap-2 text-sm text-fog hover:text-[#F3A3A5]"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete this scan
              </button>
            )}
          </div>
        </section>

        <section className="mt-24 grid gap-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Where it lives</p>
            <h2 className="mt-3 font-display text-3xl text-paper sm:text-4xl">{species.region}</h2>
            {staticMap ? (
              <img src={staticMap} alt={`Map marking ${species.region}`} className="mt-6 aspect-[5/3] w-full rounded-2xl border border-ink-600/70 object-cover" loading="lazy" />
            ) : (
              <p className="mt-6 font-mono text-sm text-mist">
                {lat.toFixed(2)}°, {lng.toFixed(2)}°
              </p>
            )}
          </div>

          <div>
            <p className="eyebrow !text-[#F3A3A5]">If it disappeared</p>
            <h2 className="mt-3 font-display text-3xl text-paper sm:text-4xl">
              {affected.length
                ? `${affected.length} ${affected.length === 1 ? 'species' : 'species'} in this guide would feel it`
                : 'No shared dependencies in this guide'}
            </h2>
            {affected.length > 0 ? (
              <ul className="mt-6 divide-y divide-ink-600/70 border-y border-ink-600/70">
                {affected.map(({ species: s, reasons }) => (
                  <li key={s.id}>
                    <Link href={`/species/${s.id}`} className="group flex items-center gap-4 py-3">
                      <SpecimenPhoto src={s.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl leading-tight text-paper group-hover:underline">{s.common_name}</span>
                        <span className="block truncate text-sm text-fog">{reasons.join(' · ')}</span>
                      </span>
                      <StatusTag code={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 max-w-md text-mist">
                None of the other species here share its food or habitat. In the wild, every species sits in a much larger web than this catalog shows.
              </p>
            )}
          </div>
        </section>
      </main>
      {scanner}
    </>
  );
}
