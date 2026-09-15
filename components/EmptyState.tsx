'use client';
import { SearchX } from 'lucide-react';

export default function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-500 px-6 py-20 text-center">
      <SearchX className="h-8 w-8 text-fog" strokeWidth={1.5} aria-hidden />
      <h3 className="mt-4 font-display text-3xl text-paper">No species match these filters</h3>
      <p className="mt-2 max-w-md text-sm text-mist">Clear a filter, or ask the guide in plain language.</p>
      <button onClick={onClearFilters} className="btn-ghost mt-6">
        Clear filters
      </button>
    </div>
  );
}
