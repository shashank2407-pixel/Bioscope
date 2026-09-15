'use client';
import type { Species } from '@/lib/ecosystem';
import SpeciesCard from './SpeciesCard';

interface SpeciesGridProps {
  speciesList: Species[];
  ripple: { targetId: string; affected: Map<string, string> } | null;
  onSimulateLoss: (species: Species) => void;
}

export default function SpeciesGrid({ speciesList, ripple, onSimulateLoss }: SpeciesGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {speciesList.map((species) => (
        <SpeciesCard
          key={species.id}
          species={species}
          onSimulateLoss={onSimulateLoss}
          ripple={
            ripple
              ? species.id === ripple.targetId
                ? 'removed'
                : ripple.affected.has(species.id)
                  ? 'at-risk'
                  : 'unaffected'
              : undefined
          }
          riskReason={ripple?.affected.get(species.id)}
        />
      ))}
    </div>
  );
}
