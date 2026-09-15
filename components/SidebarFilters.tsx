'use client';
import { Filter, RotateCcw } from 'lucide-react';

interface SidebarFiltersProps {
  selectedHabitat: string;
  setSelectedHabitat: (habitat: string) => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  habitats: string[];
  regions: string[];
  onReset: () => void;
}

export default function SidebarFilters({
  selectedHabitat,
  setSelectedHabitat,
  selectedRegion,
  setSelectedRegion,
  selectedStatus,
  setSelectedStatus,
  habitats,
  regions,
  onReset,
}: SidebarFiltersProps) {
  const statuses = [
    { id: 'LC', label: 'Least Concern' },
    { id: 'VU', label: 'Vulnerable' },
    { id: 'EN', label: 'Endangered' },
    { id: 'CR', label: 'Critically Endangered' },
  ];

  return (
    <aside className="bg-keystone-surface border border-gray-800 rounded-2xl p-6 h-fit sticky top-28">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-2 text-white font-semibold">
          <Filter className="w-4 h-4 text-keystone-accent" />
          <span>Ecosystem Filters</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-keystone-accent flex items-center space-x-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Habitats */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-3">Habitat</label>
        <div className="space-y-1.5">
          <button
            onClick={() => setSelectedHabitat('')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedHabitat === '' ? 'bg-keystone-accentMuted text-keystone-accent font-medium border border-keystone-accent/30' : 'text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            All Habitats
          </button>
          {habitats.map((hab) => (
            <button
              key={hab}
              onClick={() => setSelectedHabitat(hab)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedHabitat === hab ? 'bg-keystone-accentMuted text-keystone-accent font-medium border border-keystone-accent/30' : 'text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {hab}
            </button>
          ))}
        </div>
      </div>

      {/* Regions */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-3">Region</label>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full bg-keystone-bg border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-keystone-accent"
        >
          <option value="">All Regions</option>
          {regions.map((reg) => (
            <option key={reg} value={reg}>{reg}</option>
          ))}
        </select>
      </div>

      {/* Conservation Status */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-3">Conservation Status</label>
        <div className="space-y-1.5">
          <button
            onClick={() => setSelectedStatus('')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedStatus === '' ? 'bg-keystone-accentMuted text-keystone-accent font-medium border border-keystone-accent/30' : 'text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            All Statuses
          </button>
          {statuses.map((stat) => (
            <button
              key={stat.id}
              onClick={() => setSelectedStatus(stat.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                selectedStatus === stat.id ? 'bg-keystone-accentMuted text-keystone-accent font-medium border border-keystone-accent/30' : 'text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <span>{stat.label}</span>
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-gray-800">{stat.id}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}