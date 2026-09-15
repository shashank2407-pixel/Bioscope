'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Map, { Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { STATUS_META, THREAT_SCALE, type Species } from '@/lib/ecosystem';

type Bounds = [[number, number], [number, number]];

function boundsFor(list: Species[]): Bounds | null {
  if (list.length === 0) return null;
  const lats = list.map((s) => s.latitude);
  const lngs = list.map((s) => s.longitude);
  return [
    [Math.min(...lngs) - 3, Math.min(...lats) - 3],
    [Math.max(...lngs) + 3, Math.max(...lats) + 3],
  ];
}

export default function MapBox({ speciesList }: { speciesList: Species[] }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef>(null);
  const [selected, setSelected] = useState<Species | null>(null);
  const bounds = useMemo(() => boundsFor(speciesList), [speciesList]);

  useEffect(() => {
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 60, maxZoom: 6, duration: 800 });
  }, [bounds]);

  if (!token) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-ink-500 p-8 text-center text-mist">
        Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to show the map.
      </div>
    );
  }

  return (
    <div className="relative h-[min(70vh,640px)] min-h-[420px] overflow-hidden rounded-2xl border border-ink-600/70">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        initialViewState={bounds ? { bounds, fitBoundsOptions: { padding: 60, maxZoom: 6 } } : { latitude: 22, longitude: 80, zoom: 3.6 }}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {speciesList.map((s) => {
          const color = STATUS_META[s.status].color;
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
              <button aria-label={`${s.common_name}, ${STATUS_META[s.status].label}`} className="group relative flex h-8 w-8 items-center justify-center">
                <span className="absolute inset-0 rounded-full opacity-25 transition-opacity group-hover:opacity-60" style={{ backgroundColor: color }} />
                <span
                  className={`h-3.5 w-3.5 rounded-full border-2 ${s.source === 'scan' ? 'border-tag' : 'border-ink-900'}`}
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
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg bg-ink-900/85 px-3 py-2 font-mono text-[11px] text-mist backdrop-blur">
        {THREAT_SCALE.map((code) => (
          <span key={code} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_META[code].color }} />
            {code}
          </span>
        ))}
      </div>
    </div>
  );
}
