'use client';
import { Species } from '@/lib/ecosystem';
import { Network as NetworkIcon, Share2, ShieldAlert } from 'lucide-react';

interface NetworkViewProps {
  speciesList: Species[];
  onSelectSpecies: (species: Species) => void;
}

export default function NetworkView({ speciesList, onSelectSpecies }: NetworkViewProps) {
  return (
    <div className="bg-keystone-surface border border-gray-800 rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <NetworkIcon className="w-6 h-6 text-keystone-accent" />
            <span>Web of Life Ecosystem Graph</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">Ecosystems are networks, not lists. Explore shared dependencies.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {speciesList.map((species) => (
          <div
            key={species.id}
            onClick={() => onSelectSpecies(species)}
            className="bg-keystone-bg border border-gray-800 rounded-xl p-5 hover:border-keystone-accent cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-2 py-0.5 bg-keystone-accentMuted text-keystone-accent rounded">
                {species.habitat}
              </span>
              <span className="text-xs font-mono text-gray-500">{species.region}</span>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-keystone-accent transition-colors">{species.common_name}</h3>
            <p className="text-xs text-gray-400 italic font-serif mb-4">{species.scientific_name}</p>

            <div className="border-t border-gray-800/80 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">Connected Dependencies:</span>
              <div className="flex flex-wrap gap-1.5">
                {species.dependencies?.map((dep, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-md">
                    {dep}
                  </span>
                )) || <span className="text-xs text-gray-500 italic">No direct dependencies logged</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}