'use client';
import { useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import type { Species } from '@/lib/ecosystem';
import SpecimenPhoto from './SpecimenPhoto';

interface HeroProps {
  featured: Species;
  speciesCount: number;
  threatenedCount: number;
  onScan: (file?: File) => void;
}

export default function Hero({ featured, speciesCount, threatenedCount, onScan }: HeroProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <section className="relative overflow-hidden border-b border-ink-600/60">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <p className="eyebrow !text-tag">A field guide to India’s threatened wildlife</p>
          <h1 className="mt-5 font-display text-[2.8rem] font-light leading-[0.98] tracking-[-0.02em] text-paper sm:text-6xl lg:text-[5.1rem]">
            Photograph an animal.
            <br />
            <em className="font-normal text-mist">See what depends on it.</em>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-mist">
            Upload a wildlife photo and Keystone names the species, reads its Red List status, and shows which other species
            would feel its loss.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button className="btn-primary px-6 py-3 text-base" onClick={() => onScan()}>
              <Camera className="h-5 w-5" aria-hidden />
              Scan a photo
            </button>
            <a href="#catalog" className="btn-ghost px-6 py-3 text-base">
              Browse {speciesCount} species
            </a>
          </div>
          <p className="mt-10 max-w-md border-t border-ink-600/70 pt-5 text-sm leading-relaxed text-fog">
            {threatenedCount} of the {speciesCount} species in this guide are threatened with extinction. The scanner also works
            for birds, reptiles, insects and plants.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-[30rem]">
          <button
            type="button"
            onClick={() => onScan()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onScan(file);
            }}
            aria-label="Scan a photo. You can also drop an image onto this print."
            className="group relative block w-full rotate-[-1.5deg] bg-paper p-3 pb-0 text-left shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)] transition-transform duration-700 hover:rotate-0 sm:p-4 sm:pb-0"
          >
            <SpecimenPhoto src={featured.image_url} alt={`${featured.common_name} photograph`} className="aspect-[4/5] w-full" priority />
            <div className="flex items-end justify-between gap-4 py-3 text-ink-900 sm:py-4">
              <span>
                <span className="block font-display text-lg italic leading-tight">{featured.scientific_name}</span>
                <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-600">
                  {featured.common_name} · {featured.region}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-600">
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Drop a photo
              </span>
            </div>
            {dragging && (
              <span className="absolute inset-3 bottom-16 flex items-center justify-center border-2 border-dashed border-tag bg-ink-900/75 font-display text-2xl text-paper sm:inset-4 sm:bottom-[4.5rem]">
                Drop to identify
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
