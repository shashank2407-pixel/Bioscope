import { STATUS_META, type StatusCode } from '@/lib/ecosystem';

interface StatusTagProps {
  code: StatusCode;
  withLabel?: boolean;
  className?: string;
}

/** A museum specimen tag: paper label, coloured status dot, Red List code. */
export default function StatusTag({ code, withLabel = false, className = '' }: StatusTagProps) {
  const meta = STATUS_META[code] ?? STATUS_META.NE;
  return (
    <span
      title={meta.label}
      className={`inline-flex items-center gap-1.5 rounded-[3px] bg-paper py-0.5 pl-1.5 pr-2 font-mono text-[11px] font-bold uppercase leading-5 tracking-wide text-ink-900 shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${className}`}
    >
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {code}
      {withLabel ? (
        <span className="font-sans text-xs font-medium normal-case tracking-normal">{meta.label}</span>
      ) : (
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
