'use client';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { findAffected, type Kind, type Species } from '@/lib/ecosystem';
import { applyFilters, countByStatus, EMPTY_FILTERS, isFiltered, uniqueSorted, type CatalogFilterState } from '@/lib/filters';
import { askCatalog } from '@/lib/semantic-search';
import { useCatalog } from '@/lib/useCatalog';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import CatalogFilters from '@/components/SidebarFilters';
import KindToggle from '@/components/KindToggle';
import SearchHighlights from '@/components/SearchHighlights';
import ViewToggle, { type CatalogView } from '@/components/ViewToggle';
import SpeciesGrid from '@/components/SpeciesGrid';
import EmptyState from '@/components/EmptyState';
import NetworkView from '@/components/NetworkView';
import ExtinctionRipple from '@/components/ExtinctionRipple';
import FieldScannerModal from '@/components/FieldScannerModal';

const GlobeView = dynamic(() => import('@/components/MapBox'), {
  ssr: false,
  loading: () => <div className="h-[min(75vh,680px)] min-h-[460px] animate-pulse rounded-2xl bg-ink-800" />,
});

export default function Home() {
  const { catalog, all } = useCatalog();
  const [view, setView] = useState<CatalogView>('grid');
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_FILTERS);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [rippleTarget, setRippleTarget] = useState<Species | null>(null);
  const [scanner, setScanner] = useState<{ open: boolean; file: File | null }>({ open: false, file: null });

  const update = (patch: Partial<CatalogFilterState>) => setFilters((f) => ({ ...f, ...patch }));

  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
  const statusCounts = useMemo(() => countByStatus(applyFilters(all, { ...filters, status: '' })), [all, filters]);
  const kindCounts = useMemo(() => {
    const scoped = applyFilters(all, { ...filters, kind: '' });
    return { flora: scoped.filter((s) => s.kind === 'flora').length, fauna: scoped.filter((s) => s.kind === 'fauna').length };
  }, [all, filters]);
  const setKind = (kind: Kind | '') => update({ kind });
  const habitats = useMemo(() => uniqueSorted(all.map((s) => s.habitat)), [all]);
  const regions = useMemo(() => uniqueSorted(all.map((s) => s.region)), [all]);

  const affected = useMemo(() => (rippleTarget ? findAffected(rippleTarget, all) : []), [rippleTarget, all]);
  const ripple = rippleTarget
    ? { targetId: rippleTarget.id, affected: new Map(affected.map((a) => [a.species.id, a.reasons.join(' · ')])) }
    : null;

  const featured = catalog.find((s) => s.id === 'snow-leopard') ?? catalog[0];
  const threatenedCount = catalog.filter((s) => ['VU', 'EN', 'CR'].includes(s.status)).length;

  const ask = async (query: string) => {
    setAsking(true);
    try {
      const result = await askCatalog(query, all);
      update({ aiIds: result.ids });
      setAiSummary(result.summary);
    } catch {
      setAiSummary('The guide is unavailable, showing name matches instead');
    } finally {
      setAsking(false);
    }
  };

  const resetAll = () => {
    setFilters(EMPTY_FILTERS);
    setAiSummary(null);
    setRippleTarget(null);
  };

  const openScanner = (file?: File) => setScanner({ open: true, file: file ?? null });

  return (
    <>
      <Navbar onOpenScanner={() => openScanner()} />
      <main>
        <Hero featured={featured} speciesCount={catalog.length} threatenedCount={threatenedCount} onScan={openScanner} />

        <section id="catalog" className="mx-auto max-w-7xl scroll-mt-16 px-5 py-14 sm:px-8 lg:py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">The catalog</p>
              <h2 className="mt-3 font-display text-4xl font-light tracking-[-0.01em] text-paper sm:text-5xl">
                Species, and the web they hold up
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <KindToggle value={filters.kind} onChange={setKind} counts={kindCounts} />
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <SearchBar
              query={filters.query}
              onQueryChange={(query) => {
                update({ query, aiIds: null });
                setAiSummary(null);
              }}
              onAsk={ask}
              asking={asking}
              aiSummary={aiSummary}
              resultCount={filtered.length}
              onClearAi={() => {
                update({ aiIds: null, query: '' });
                setAiSummary(null);
              }}
            />
            <SearchHighlights speciesList={filtered} active={Boolean(filters.query.trim() || filters.aiIds)} />
            <CatalogFilters
              counts={statusCounts}
              status={filters.status}
              onStatus={(status) => update({ status })}
              habitats={habitats}
              habitat={filters.habitat}
              onHabitat={(habitat) => update({ habitat })}
              regions={regions}
              region={filters.region}
              onRegion={(region) => update({ region })}
              canReset={isFiltered(filters)}
              onReset={resetAll}
            />
          </div>

          <div className="mt-8">
            <p className="mb-4 font-mono text-xs text-fog">
              {filtered.length} of {all.length} species
            </p>
            {filtered.length === 0 ? (
              <EmptyState onClearFilters={resetAll} />
            ) : view === 'grid' ? (
              <SpeciesGrid speciesList={filtered} ripple={ripple} onSimulateLoss={setRippleTarget} />
            ) : view === 'map' ? (
              <GlobeView speciesList={filtered} kind={filters.kind} onKindChange={setKind} kindCounts={kindCounts} />
            ) : (
              <NetworkView speciesList={filtered} />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-600/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-10 text-sm text-fog sm:px-8 md:flex-row md:justify-between">
          <p>
            <span className="font-display text-lg text-paper">Keystone</span> — a field guide to India’s threatened wildlife.
          </p>
          <p>Photos from Wikimedia Commons contributors · Status from the IUCN Red List · Identification by Gemini, with OpenAI as fallback.</p>
        </div>
      </footer>

      <ExtinctionRipple target={rippleTarget} affected={affected} onClose={() => setRippleTarget(null)} />
      <FieldScannerModal isOpen={scanner.open} initialFile={scanner.file} onClose={() => setScanner({ open: false, file: null })} />
    </>
  );
}
