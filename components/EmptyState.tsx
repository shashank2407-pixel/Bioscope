'use client';
import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  onClearFilters: () => void;
}

export default function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="col-span-full py-20 bg-keystone-surface rounded-2xl border border-gray-800 text-center flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-keystone-accentMuted flex items-center justify-center text-keystone-accent mb-4 border border-keystone-accent/30">
        <SearchX className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No species found in this exact criteria.</h3>
      <p className="text-gray-400 text-sm max-w-md mb-6">
        Try broadening your search parameters or clearing current filters to explore the full catalog.
      </p>
      <button
        onClick={onClearFilters}
        className="px-6 py-2.5 bg-keystone-accent text-keystone-bg font-semibold rounded-xl text-sm transition-all shadow-lg shadow-keystone-accent/20 hover:opacity-90"
      >
        Clear All Filters
      </button>
    </div>
  );
}