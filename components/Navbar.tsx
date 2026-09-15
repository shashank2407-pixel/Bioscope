'use client';
import { Globe, Network, MapPin, Camera } from 'lucide-react';

interface NavbarProps {
  currentView: 'grid' | 'map' | 'network';
  setCurrentView: (view: 'grid' | 'map' | 'network') => void;
  userLocation: string;
  onOpenScanner: () => void;
}

export default function Navbar({ currentView, setCurrentView, userLocation, onOpenScanner }: NavbarProps) {
  return (
    <header className="border-b border-gray-800 bg-keystone-surface/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-keystone-accentMuted border border-keystone-accent flex items-center justify-center text-keystone-accent font-bold text-xl shadow-lg shadow-keystone-accent/10">
          K
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider text-white">KEYSTONE</h1>
          <p className="text-xs text-gray-400 italic">Discover the connections that keep our world alive[cite: 1].</p>
        </div>
      </div>

      <div className="flex items-center bg-keystone-bg p-1 rounded-xl border border-gray-800">
        <button
          onClick={() => setCurrentView('grid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            currentView === 'grid'
              ? 'bg-keystone-accent text-keystone-bg font-semibold shadow-lg shadow-keystone-accent/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Catalog Grid
        </button>
        <button
          onClick={() => setCurrentView('map')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
            currentView === 'map'
              ? 'bg-keystone-accent text-keystone-bg font-semibold shadow-lg shadow-keystone-accent/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Map View</span>
        </button>
        <button
          onClick={() => setCurrentView('network')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
            currentView === 'network'
              ? 'bg-keystone-accent text-keystone-bg font-semibold shadow-lg shadow-keystone-accent/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Web of Life</span>
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenScanner}
          className="px-3.5 py-2 bg-keystone-accentMuted text-keystone-accent border border-keystone-accent/30 rounded-xl text-xs font-semibold hover:bg-keystone-accent hover:text-keystone-bg transition-all flex items-center space-x-2 shadow-lg shadow-keystone-accent/5"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Field Photo</span>
        </button>

        <div className="hidden xl:flex items-center space-x-2 bg-keystone-bg px-3 py-2 rounded-xl border border-gray-800 text-xs text-gray-300">
          <MapPin className="w-3.5 h-3.5 text-keystone-accent animate-pulse" />
          <span>Local: <strong className="text-white">{userLocation}</strong></span>
        </div>
      </div>
    </header>
  );
}