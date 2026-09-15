'use client';
import { Species } from '@/lib/ecosystem';
import { ShieldAlert, X } from 'lucide-react';

interface ExtinctionRippleProps {
  targetSpecies: Species | null;
  affectedCount: number;
  onClose: () => void;
}

export default function ExtinctionRipple({ targetSpecies, affectedCount, onClose }: ExtinctionRippleProps) {
  if (!targetSpecies) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-keystone-surface border border-red-500/40 rounded-2xl p-6 shadow-2xl max-w-md animate-bounce-short">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 text-red-400 font-bold">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
          <span>Extinction Ripple Active</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-gray-200 mb-2">
        Simulating the removal of <strong className="text-white">{targetSpecies.common_name}</strong> ({targetSpecies.scientific_name}).
      </p>
      <p className="text-xs text-gray-400 mb-4">
        Propagation algorithm detected <strong className="text-red-400">{affectedCount} connected species</strong> at direct risk due to shared habitat and dietary dependency collapse.
      </p>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors"
        >
          Reset Ecosystem Simulation
        </button>
      </div>
    </div>
  );
}