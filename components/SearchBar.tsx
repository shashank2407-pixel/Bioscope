'use client';
import type { FormEvent } from 'react';
import { LoaderCircle, Search, Sparkles, X } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onAsk: (q: string) => void;
  asking: boolean;
  aiSummary: string | null;
  resultCount: number;
  onClearAi: () => void;
}

export default function SearchBar({ query, onQueryChange, onAsk, asking, aiSummary, resultCount, onClearAi }: SearchBarProps) {
  const canAsk = query.trim().length >= 2 && !asking;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canAsk) onAsk(query.trim());
  };

  return (
    <div>
      <form
        role="search"
        onSubmit={submit}
        className="flex items-center gap-2 rounded-2xl border border-ink-500/80 bg-ink-800/60 p-1.5 pl-4 transition-colors focus-within:border-mist"
      >
        <Search className="h-5 w-5 shrink-0 text-fog" aria-hidden />
        <label htmlFor="catalog-search" className="sr-only">
          Search the catalog
        </label>
        <input
          id="catalog-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, or ask: which species rely on fig trees?"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-paper placeholder:text-fog focus:outline-none focus-visible:outline-none"
        />
        <button type="submit" disabled={!canAsk} className="btn-primary px-4 py-2">
          {asking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{asking ? 'Asking…' : 'Ask the guide'}</span>
          <span className="sm:hidden">Ask</span>
        </button>
      </form>
      <div className="mt-2 min-h-7 text-sm" aria-live="polite">
        {aiSummary !== null ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-700 py-1 pl-3 pr-2 text-mist">
            <Sparkles className="h-3.5 w-3.5 text-tag" aria-hidden />
            {aiSummary || 'Guide results'} · {resultCount} found
            <button onClick={onClearAi} aria-label="Clear guide results" className="rounded-full p-0.5 hover:bg-ink-600 hover:text-paper">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <span className="text-fog">Typing filters by name. Press Enter to ask in plain language.</span>
        )}
      </div>
    </div>
  );
}
