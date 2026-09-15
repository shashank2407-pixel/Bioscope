'use client';
import React, { useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import { Species } from '@/lib/ecosystem';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapBoxProps {
  speciesList: Species[];
}

export default function MapBox({ speciesList }: MapBoxProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken || mapboxToken === 'your-mapbox-token') {
    return (
      <div className="w-full h-[600px] bg-keystone-surface rounded-2xl border border-gray-800 flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Mapbox Token Required</h3>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          Please configure your <code className="text-keystone-accent">NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code className="text-keystone-accent">.env.local</code> to render the live geospatial map.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
          {speciesList.map((s) => (
            <div key={s.id} className="bg-keystone-bg p-4 rounded-xl border border-gray-800 text-left">
              <span className="text-xs text-keystone-accent font-bold">{s.region}</span>
              <h4 className="text-white font-semibold">{s.common_name}</h4>
              <p className="text-xs text-gray-400 font-serif italic">{s.scientific_name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative">
      <Map
        initialViewState={{
          latitude: 23.17,
          longitude: 79.93,
          zoom: 3.5,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={mapboxToken}
      >
        {speciesList.map((species) => (
          <Marker
            key={species.id}
            latitude={species.latitude}
            longitude={species.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedSpecies(species);
            }}
          >
            <div className="w-8 h-8 rounded-full bg-keystone-accentMuted border-2 border-keystone-accent flex items-center justify-center cursor-pointer shadow-lg hover:scale-125 transition-transform">
              <div className="w-2.5 h-2.5 rounded-full bg-keystone-accent animate-ping" />
            </div>
          </Marker>
        ))}

        {selectedSpecies && (
          <Popup
            latitude={selectedSpecies.latitude}
            longitude={selectedSpecies.longitude}
            anchor="top"
            onClose={() => setSelectedSpecies(null)}
            closeButton={true}
            className="rounded-xl overflow-hidden"
          >
            <div className="bg-keystone-surface text-white p-3 max-w-xs border border-gray-800 rounded-xl">
              <img src={selectedSpecies.image_url} alt={selectedSpecies.common_name} className="w-full h-28 object-cover rounded-lg mb-2" />
              <h4 className="font-bold text-sm">{selectedSpecies.common_name}</h4>
              <p className="text-xs text-gray-400 italic font-serif mb-2">{selectedSpecies.scientific_name}</p>
              <span className="px-2 py-0.5 bg-keystone-accentMuted text-keystone-accent text-[10px] font-bold rounded">
                {selectedSpecies.status}
              </span>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}