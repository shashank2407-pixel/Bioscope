'use client';
import { motion } from 'framer-motion';
import { Species } from '@/lib/ecosystem';
import Link from 'next/link';

interface SpeciesCardProps {
  species: Species;
  index: number;
  isAffected?: boolean;
  onSimulateRipple?: (species: Species) => void;
}

export default function SpeciesCard({ species, index, isAffected, onSimulateRipple }: SpeciesCardProps) {
  const statusColors = {
    LC: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    VU: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    EN: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CR: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, filter: isAffected ? 'grayscale(100%) opacity(40%)' : 'grayscale(0%) opacity(100%)' }}
      transition={{ delay: index * 0.05 }}
      className="bg-keystone-surface rounded-xl overflow-hidden border border-gray-800 hover:border-keystone-accent transition-all group flex flex-col justify-between"
    >
      <div>
        <div className="relative h-48 overflow-hidden bg-gray-900">
          <img
            src={species.image_url}
            alt={species.common_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=800';
            }}
          />
          <div className="absolute top-3 right-3 flex space-x-2">
            <span className={`px-2.5 py-1 text-xs rounded-full font-bold border backdrop-blur-md ${statusColors[species.status] || 'bg-gray-800 text-gray-300'}`}>
              {species.status}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xl font-bold text-white group-hover:text-keystone-accent transition-colors">{species.common_name}</h3>
          <p className="text-gray-400 italic text-sm font-serif mb-3">{species.scientific_name}</p>
          <p className="text-gray-300 text-sm line-clamp-2 mb-4">{species.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-1 bg-keystone-bg text-xs rounded-md text-gray-300 border border-gray-800">
              {species.habitat}
            </span>
            <span className="px-2.5 py-1 bg-keystone-bg text-xs rounded-md text-gray-300 border border-gray-800">
              {species.region}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-0 flex items-center justify-between gap-2 border-t border-gray-800/60 pt-4">
        <Link
          href={`/species/${species.id}`}
          className="text-xs font-semibold text-keystone-accent hover:underline flex items-center space-x-1"
        >
          <span>Explore Field Guide →</span>
        </Link>
        {onSimulateRipple && (species.status === 'EN' || species.status === 'CR') && (
          <button
            onClick={() => onSimulateRipple(species)}
            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg font-medium transition-colors"
          >
            Simulate Loss
          </button>
        )}
      </div>
    </motion.div>
  );
}