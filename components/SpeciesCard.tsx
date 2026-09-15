'use client';
import Link from 'next/link';
import type { Species } from '@/lib/ecosystem';
import SpecimenPhoto from './SpecimenPhoto';
import StatusTag from './StatusTag';

export type RippleState = 'removed' | 'at-risk' | 'unaffected';

interface SpeciesCardProps {
  species: Species;
  ripple?: RippleState;
  riskReason?: string;
  onSimulateLoss?: (species: Species) => void;
}

export default function SpeciesCard({ species, ripple, riskReason, onSimulateLoss }: SpeciesCardProps) {
  const threatened = species.status === 'VU' || species.status === 'EN' || species.status === 'CR';
  const frame =
    ripple === 'at-risk'
      ? 'border-[#E5484D]/70 ring-1 ring-[#E5484D]/40'
      : ripple === 'removed'
        ? 'border-ink-600 opacity-60 grayscale'
        : ripple === 'unaffected'
          ? 'border-ink-600/60 opacity-35'
          : 'border-ink-600/70 hover:border-ink-500';

  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-ink-800/70 transition-all duration-500 ${frame}`}>
      <Link href={`/species/${species.id}`} className="block focus-visible:[outline-offset:-3px]">
        <div className="relative">
          <SpecimenPhoto src={species.image_url} alt={species.common_name} className="aspect-[4/3] w-full" />
          <div className="absolute left-3 top-3 flex gap-2">
            <StatusTag code={species.status} />
            {species.source === 'scan' && (
              <span className="rounded-[3px] bg-tag px-1.5 font-mono text-[11px] font-bold uppercase leading-5 text-ink-900">Your scan</span>
            )}
          </div>
          {ripple === 'at-risk' && (
            <span className="absolute bottom-3 left-3 rounded-[3px] bg-[#E5484D] px-2 font-mono text-[11px] font-bold uppercase leading-5 text-white">
              At risk
            </span>
          )}
          {ripple === 'removed' && (
            <span className="absolute bottom-3 left-3 rounded-[3px] bg-ink-900 px-2 font-mono text-[11px] font-bold uppercase leading-5 text-paper">
              Removed
            </span>
          )}
        </div>
        <div className="px-5 pt-4">
          <h3 className="font-display text-[1.6rem] leading-tight text-paper">{species.common_name}</h3>
          <p className="font-display text-base italic text-mist">{species.scientific_name}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-mist/90">
            {ripple === 'at-risk' && riskReason ? riskReason : species.description}
          </p>
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-between gap-3 px-5 pb-4 pt-4">
        <span className="truncate font-mono text-[11px] uppercase tracking-wider text-fog">
          {species.habitat} · {species.region}
        </span>
        {onSimulateLoss && threatened && !ripple && (
          <button
            onClick={() => onSimulateLoss(species)}
            className="shrink-0 rounded-full border border-ink-500 px-3 py-1 text-xs text-mist transition-colors hover:border-[#E5484D] hover:text-[#F3A3A5]"
          >
            Simulate loss
          </button>
        )}
      </div>
    </article>
  );
}
