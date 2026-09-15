'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Camera, Check, LoaderCircle, RotateCcw, TriangleAlert, Upload, X } from 'lucide-react';
import type { Species } from '@/lib/ecosystem';
import { prepareImage } from '@/lib/image';
import { saveScan } from '@/lib/useCatalog';
import SpecimenPhoto from './SpecimenPhoto';
import StatusTag from './StatusTag';

interface FieldScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** A file dropped elsewhere on the page; identification starts as soon as the modal opens. */
  initialFile?: File | null;
}

type Phase =
  | { name: 'idle' }
  | { name: 'scanning'; preview: string }
  | { name: 'result'; preview: string; species: Species; cues: string }
  | { name: 'rejected'; preview: string; reason: string }
  | { name: 'error'; preview?: string; message: string };

const STEPS = ['Reading the silhouette', 'Comparing markings', 'Checking the Red List', 'Mapping its range'];
const PROVIDER_LABEL: Record<string, string> = { gemini: 'Gemini', openai: 'OpenAI' };

const TITLES: Record<Phase['name'], string> = {
  idle: 'Identify a species from a photo',
  scanning: 'Identifying…',
  result: 'Species identified',
  rejected: 'No animal or plant found',
  error: 'Couldn’t identify this photo',
};

export default function FieldScannerModal({ isOpen, onClose, initialFile }: FieldScannerModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [step, setStep] = useState(0);
  const [developed, setDeveloped] = useState(false);
  const [dragging, setDragging] = useState(false);
  const requestId = useRef(0);
  const lastFile = useRef<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const identify = useCallback(async (file: File) => {
    const id = ++requestId.current;
    lastFile.current = file;
    setDeveloped(false);

    let prepared;
    try {
      prepared = await prepareImage(file);
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof Error ? err.message : 'That image couldn’t be read.' });
      return;
    }
    if (id !== requestId.current) return;
    setStep(0);
    setPhase({ name: 'scanning', preview: prepared.dataUrl });

    try {
      const res = await fetch('/api/identify-species', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: prepared.dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (id !== requestId.current) return;
      if (!res.ok) throw new Error(body.error || `Identification failed (HTTP ${res.status}).`);

      if (!body.identified) {
        setPhase({ name: 'rejected', preview: prepared.dataUrl, reason: body.reason });
        return;
      }

      const { visual_cues, ...fields } = body.species;
      const species: Species = {
        ...fields,
        id: `scan-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        image_url: prepared.thumbUrl,
        source: 'scan',
        identified_by: body.provider,
        scanned_at: new Date().toISOString(),
      };
      saveScan(species);
      setPhase({ name: 'result', preview: prepared.dataUrl, species, cues: visual_cues ?? '' });
    } catch (err) {
      if (id !== requestId.current) return;
      const message =
        err instanceof TypeError
          ? 'Couldn’t reach the server. Check your connection and try again.'
          : err instanceof Error
            ? err.message
            : 'Identification failed.';
      setPhase({ name: 'error', preview: prepared.dataUrl, message });
    }
  }, []);

  // Start immediately when opened with a dropped file; reset when closed.
  useEffect(() => {
    if (isOpen && initialFile) identify(initialFile);
    if (!isOpen) {
      requestId.current++;
      setPhase({ name: 'idle' });
    }
  }, [isOpen, initialFile, identify]);

  useEffect(() => {
    if (phase.name !== 'scanning') return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1700);
    return () => clearInterval(timer);
  }, [phase.name]);

  useEffect(() => {
    if (phase.name !== 'result') return;
    const t = setTimeout(() => setDeveloped(true), 150);
    return () => clearTimeout(t);
  }, [phase.name]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) identify(file);
  };

  const reset = () => {
    requestId.current++;
    setPhase({ name: 'idle' });
  };

  const preview = 'preview' in phase ? phase.preview : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/80 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="scanner-title"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-ink-600 bg-ink-900 shadow-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-900/95 px-6 pb-4 pt-5 backdrop-blur">
              <div>
                <p className="eyebrow">Field scanner</p>
                <h2 id="scanner-title" className="mt-1 font-display text-2xl text-paper">
                  {TITLES[phase.name]}
                </h2>
              </div>
              <button ref={closeButton} onClick={onClose} aria-label="Close scanner" className="rounded-full p-2 text-mist hover:bg-ink-800 hover:text-paper">
                <X className="h-5 w-5" />
              </button>
            </div>

            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />

            {phase.name === 'idle' || (phase.name === 'error' && !preview) ? (
              <div className="p-6">
                {phase.name === 'error' && (
                  <p className="mb-4 flex items-start gap-2 rounded-xl bg-[#E5484D]/10 px-4 py-3 text-sm text-[#F3A3A5]">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {phase.message}
                  </p>
                )}
                <div
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) identify(file);
                  }}
                  className={`flex min-h-[18rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
                    dragging ? 'border-tag bg-ink-800' : 'border-ink-500 hover:border-mist hover:bg-ink-800/50'
                  }`}
                >
                  <Upload className="h-8 w-8 text-mist" strokeWidth={1.5} aria-hidden />
                  <p className="font-display text-2xl text-paper">Drop a photo here</p>
                  <p className="max-w-sm text-sm text-fog">
                    JPEG, PNG or WebP. A clear, close shot of one animal or plant gives the most reliable match.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInput.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4" aria-hidden />
                      Choose a photo
                    </button>
                    <button
                      type="button"
                      className="btn-ghost sm:hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInput.current?.click();
                      }}
                    >
                      <Camera className="h-4 w-4" aria-hidden />
                      Take a photo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-8">
                <div className="relative self-start bg-paper p-2.5">
                  <SpecimenPhoto src={preview} alt="Your photo" develop={developed ? 'always' : 'never'} className="aspect-[4/5] w-full" priority />
                  {phase.name === 'scanning' && (
                    <div aria-hidden className="pointer-events-none absolute inset-2.5 overflow-hidden">
                      <div className="scan-sweep" />
                    </div>
                  )}
                </div>

                <div aria-live="polite">
                  {phase.name === 'scanning' && (
                    <>
                      <ol className="space-y-4 pt-2">
                        {STEPS.map((label, i) => (
                          <li key={label} className={`flex items-center gap-3 font-mono text-sm ${i < step ? 'text-mist' : i === step ? 'text-paper' : 'text-fog/60'}`}>
                            {i < step ? (
                              <Check className="h-4 w-4 text-tag" aria-hidden />
                            ) : i === step ? (
                              <LoaderCircle className="h-4 w-4 animate-spin text-tag" aria-hidden />
                            ) : (
                              <span className="mx-1.5 h-1 w-1 rounded-full bg-current" aria-hidden />
                            )}
                            {label}
                          </li>
                        ))}
                      </ol>
                      <p className="mt-8 text-sm text-fog">This usually takes 5–10 seconds.</p>
                    </>
                  )}

                  {phase.name === 'result' && (
                    <>
                      <p className="eyebrow">
                        {Math.round((phase.species.confidence ?? 0) * 100)}% match · via {PROVIDER_LABEL[phase.species.identified_by ?? ''] ?? 'AI'}
                      </p>
                      <h3 className="mt-2 font-display text-4xl font-light leading-[1.02] text-paper sm:text-5xl">{phase.species.common_name}</h3>
                      <p className="mt-1 font-display text-xl italic text-mist">{phase.species.scientific_name}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <StatusTag code={phase.species.status} withLabel />
                        <span className="font-mono text-[11px] uppercase tracking-wider text-fog">
                          {phase.species.habitat} · {phase.species.region}
                        </span>
                      </div>
                      {(phase.species.confidence ?? 0) < 0.5 && (
                        <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#E9C46A]/10 px-3 py-2 text-sm text-[#F1D58F]">
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                          Low confidence. A closer, sharper photo will give a more reliable match.
                        </p>
                      )}
                      <p className="mt-4 text-[15px] leading-relaxed text-mist">{phase.species.description}</p>
                      {phase.cues && (
                        <p className="mt-3 text-sm text-fog">
                          <span className="text-mist">Identified from: </span>
                          {phase.cues}
                        </p>
                      )}
                      {!!phase.species.dependencies?.length && (
                        <div className="mt-5">
                          <p className="eyebrow mb-2">Depends on</p>
                          <ul className="flex flex-wrap gap-1.5">
                            {phase.species.dependencies.map((d) => (
                              <li key={d} className="rounded-full border border-ink-500 px-2.5 py-0.5 text-sm text-mist">
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-7 flex flex-wrap gap-3">
                        <button
                          className="btn-primary"
                          onClick={() => {
                            const id = phase.species.id;
                            onClose();
                            router.push(`/species/${id}`);
                          }}
                        >
                          Open field guide page
                          <ArrowUpRight className="h-4 w-4" aria-hidden />
                        </button>
                        <button className="btn-ghost" onClick={reset}>
                          <RotateCcw className="h-4 w-4" aria-hidden />
                          Scan another
                        </button>
                      </div>
                      <p className="mt-4 text-xs text-fog">Saved to your scans in this browser.</p>
                    </>
                  )}

                  {phase.name === 'rejected' && (
                    <>
                      <p className="text-[15px] leading-relaxed text-mist">{phase.reason}</p>
                      <button className="btn-primary mt-6" onClick={() => fileInput.current?.click()}>
                        <Upload className="h-4 w-4" aria-hidden />
                        Try another photo
                      </button>
                    </>
                  )}

                  {phase.name === 'error' && (
                    <>
                      <p className="flex items-start gap-2 rounded-xl bg-[#E5484D]/10 px-4 py-3 text-sm text-[#F3A3A5]">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {phase.message}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        {lastFile.current && (
                          <button className="btn-primary" onClick={() => lastFile.current && identify(lastFile.current)}>
                            <RotateCcw className="h-4 w-4" aria-hidden />
                            Try again
                          </button>
                        )}
                        <button className="btn-ghost" onClick={() => fileInput.current?.click()}>
                          Choose another photo
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
