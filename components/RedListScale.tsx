import { STATUS_META, THREAT_SCALE, type StatusCode } from '@/lib/ecosystem';
import StatusTag from './StatusTag';

/** Read-only position of a species on the ordered Red List scale. */
export default function RedListScale({ status }: { status: StatusCode }) {
  const onScale = THREAT_SCALE.includes(status);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">IUCN Red List</span>
        <StatusTag code={status} withLabel />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1" aria-hidden>
        {THREAT_SCALE.map((code) => (
          <div
            key={code}
            className="h-2 rounded-full transition-opacity"
            style={{ backgroundColor: STATUS_META[code].color, opacity: code === status ? 1 : onScale ? 0.16 : 0.08 }}
          />
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1 font-mono text-[10px] text-fog" aria-hidden>
        {THREAT_SCALE.map((code) => (
          <span key={code} className={code === status ? 'font-bold text-paper' : ''}>
            {code}
          </span>
        ))}
      </div>
    </div>
  );
}
