'use client';
import { useState } from 'react';
import { Leaf } from 'lucide-react';

interface SpecimenPhotoProps {
  src?: string;
  alt: string;
  /** hover: cyanotype until the parent `.group` is hovered/focused. always: full colour. never: stays cyanotype. */
  develop?: 'hover' | 'always' | 'never';
  className?: string;
  priority?: boolean;
}

export default function SpecimenPhoto({ src, alt, develop = 'hover', className = '', priority = false }: SpecimenPhotoProps) {
  const [failed, setFailed] = useState(false);
  const loading = priority ? 'eager' : 'lazy';

  return (
    <div className={`specimen ${develop === 'always' ? 'is-developed' : ''} ${className}`} data-develop={develop}>
      {src && !failed ? (
        <>
          <img src={src} alt={alt} loading={loading} decoding="async" onError={() => setFailed(true)} />
          <img src={src} alt="" aria-hidden className="specimen-cyano" loading={loading} decoding="async" />
        </>
      ) : (
        <div role="img" aria-label={alt} className="absolute inset-0 flex items-center justify-center text-paper/35">
          <Leaf className="h-10 w-10" strokeWidth={1.25} />
        </div>
      )}
    </div>
  );
}
