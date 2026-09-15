'use client';
import Link from 'next/link';
import { Camera } from 'lucide-react';

export default function Navbar({ onOpenScanner }: { onOpenScanner: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-600/60 bg-ink-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-[1.7rem] leading-none tracking-tight text-paper">Keystone</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-fog sm:inline">Field guide · India</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link href="/#catalog" className="hidden text-sm text-mist transition-colors hover:text-paper sm:inline">
            Catalog
          </Link>
          <button onClick={onOpenScanner} className="btn-primary px-4 py-2">
            <Camera className="h-4 w-4" aria-hidden />
            Scan a photo
          </button>
        </nav>
      </div>
    </header>
  );
}
