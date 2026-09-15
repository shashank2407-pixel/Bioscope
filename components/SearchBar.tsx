'use client';
import { Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSemanticSearch: (query: string) => void;
  isSearchingAI: boolean;
}

export default function SearchBar({ searchQuery, setSearchQuery, onSemanticSearch, isSearchingAI }: SearchBarProps) {
  return (
    <div className="relative mb-8">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
        {isSearchingAI ? <Sparkles className="w-5 h-5 text-keystone-accent animate-spin" /> : <Search className="w-5 h-5 text-keystone-accent" />}
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          onSemanticSearch(e.target.value);
        }}
        placeholder="Search species or try natural language (e.g., 'endangered mammals in forests')..."
        className="w-full bg-keystone-surface border border-gray-800 rounded-2xl pl-12 pr-28 py-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-keystone-accent transition-all shadow-lg"
      />
      <div className="absolute inset-y-2 right-2 flex items-center">
        <span className="px-3 py-1.5 bg-keystone-bg border border-gray-800 text-xs text-gray-400 rounded-xl flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-keystone-accent" />
          <span>Semantic AI</span>
        </span>
      </div>
    </div>
  );
}