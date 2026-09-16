'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Map, { Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { STATUS_META, THREAT_SCALE, type Kind, type Species } from '@/lib/ecosystem';
import KindToggle from './KindToggle';

interface GlobeViewProps {
  speciesList: Species[];
  kind: Kind | '';
  onKindChange: (kind: Kind | '') => void;
  kindCounts: { flora: number; fauna: number };
}

/** Mean position of the plotted species, used to spin the globe to the data. */
function centroid(list: Species[]) {
  if (list.length === 0) return { latitude: 20, longitude: 78 };
  const sum = list.reduce((acc, s) => ({ lat: acc.lat + s.latitude, lng: acc.lng + s.longitude }), { lat: 0, lng: 0 });
  return { latitude: sum.lat / list.length, longitude: sum.lng / list.length };
}

export default function GlobeView({ speciesList, kind, onKindChange, kindCounts }: GlobeViewProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef>(null);
  const [selected, setSelected] = useState<Species | null>(null);
  const center = useMemo(() => centroid(speciesList), [speciesList]);

  // Spin to the new centre whenever the filter changes what's plotted.
  useEffect(() => {
    mapRef.current?.flyTo({ center: [center.longitude, center.latitude], duration: 1400, essential: true });
  }, [center.latitude, center.longitude]);

  if (!token) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-ink-500 p-8 text-center text-mist">
        Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to show the globe.
      </div>
    );
  }

  return (
    <div className="relative h-[min(75vh,680px)] min-h-[460px] overflow-hidden rounded-2xl border border-ink-600/70">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        projection={{ name: 'globe' }}
        initialViewState={{ ...center, zoom: 2.4 }}
        minZoom={1.2}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
        onLoad={(e) => {
          // Atmosphere tuned to the page's ink palette.
          e.target.setFog({
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(36, 92, 223)',
            'horizon-blend': 0.02,
            'space-color': '#061521',
            'star-intensity': 0.5,
          });
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {speciesList.map((s) => {
          const color = STATUS_META[s.status].color;
          const isFlora = s.kind === 'flora';
          return (
            <Marker
              key={s.id}
              latitude={s.latitude}
              longitude={s.longitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelected(s);
              }}
            >
              <button
                aria-label={`${s.common_name}, ${isFlora ? 'flora' : 'fauna'}, ${STATUS_META[s.status].label}`}
                className="group relative flex h-8 w-8 items-center justify-center"
              >
                <span className="absolute inset-0 rounded-full opacity-25 transition-opacity group-hover:opacity-60" style={{ backgroundColor: color }} />
                {/* Flora are diamonds, fauna are circles, so kind reads without colour. */}
                <span
                  className={`h-3.5 w-3.5 border-2 ${isFlora ? 'rotate-45 rounded-[2px]' : 'rounded-full'} ${
                    s.source === 'scan' ? 'border-tag' : 'border-ink-900'
                  }`}
                  style={{ backgroundColor: color }}
                />
              </button>
            </Marker>
          );
        })}
        {selected && (
          <Popup
            latitude={selected.latitude}
            longitude={selected.longitude}
            anchor="bottom"
            offset={20}
            closeButton={false}
            maxWidth="260px"
            onClose={() => setSelected(null)}
          >
            <div className="w-60 overflow-hidden rounded-xl bg-paper text-ink-900 shadow-2xl">
              <img src={selected.image_url} alt={selected.common_name} className="h-32 w-full object-cover" />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-lg leading-tight">{selected.common_name}</h4>
                  <span className="mt-1 flex items-center gap-1 font-mono text-[11px] font-bold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_META[selected.status].color }} />
                    {selected.status}
                  </span>
                </div>
                <p className="font-display text-sm italic text-ink-600">{selected.scientific_name}</p>
                <Link href={`/species/${selected.id}`} className="mt-2 inline-block font-mono text-[11px] uppercase tracking-wider underline underline-offset-2">
                  Open field guide page →
                </Link>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto">
          <KindToggle value={kind} onChange={onKindChange} counts={kindCounts} compact />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-lg bg-ink-900/85 px-3 py-2 font-mono text-[11px] text-mist backdrop-blur">
        {THREAT_SCALE.map((code) => (
          <span key={code} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_META[code].color }} />
            {code}
          </span>
        ))}
        <span className="flex items-center gap-1.5 border-l border-ink-600 pl-3">
          <span className="h-2.5 w-2.5 rotate-45 rounded-[1px] bg-mist" />
          flora
          <span className="ml-2 h-2.5 w-2.5 rounded-full bg-mist" />
          fauna
        </span>
      </div>
    </div>
  );
}
