'use client';
import { Species } from '@/lib/ecosystem';
import SpeciesCard from './SpeciesCard';
import EmptyState from './EmptyState';

interface SpeciesGridProps {
  speciesList: Species[];
  affectedSpeciesIds: string[];
  onSimulateRipple: (species: Species) => void;
  onClearFilters: () => void;
}

export default function SpeciesGrid({ speciesList, affectedSpeciesIds, onSimulateRipple, onClearFilters }: SpeciesGridProps) {
  if (speciesList.length === 0) {
    return <EmptyState onClearFilters={onClearFilters} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {speciesList.map((species, index) => (
        <SpeciesCard
          key={species.id}
          species={species}
          index={index}
          isAffected={affectedSpeciesIds.includes(species.id)}
          onSimulateRipple={onSimulateRipple}
        />
      ))}
    </div>
  );
}