'use client';
import { useState, useEffect } from 'react';
import { Species } from '@/lib/ecosystem';
import { supabase } from '@/lib/supabase';
import mockData from '@/public/mockData.json';
import Navbar from '@/components/Navbar';
import SidebarFilters from '@/components/SidebarFilters';
import SearchBar from '@/components/SearchBar';
import SpeciesGrid from '@/components/SpeciesGrid';
import MapBox from '@/components/MapBox';
import NetworkView from '@/components/NetworkView';
import ExtinctionRipple from '@/components/ExtinctionRipple';
import FieldScannerModal from '@/components/FieldScannerModal';

export default function Home() {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [filteredSpecies, setFilteredSpecies] = useState<Species[]>([]);
  const [currentView, setCurrentView] = useState<'grid' | 'map' | 'network'>('grid');
  
  const [selectedHabitat, setSelectedHabitat] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  const [activeRippleSpecies, setActiveRippleSpecies] = useState<Species | null>(null);
  const [affectedIds, setAffectedIds] = useState<string[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase.from('species').select('*');
        if (error || !data || data.length === 0) {
          setSpeciesList(mockData as Species[]);
          setFilteredSpecies(mockData as Species[]);
        } else {
          setSpeciesList(data as Species[]);
          setFilteredSpecies(data as Species[]);
        }
      } catch (err) {
        setSpeciesList(mockData as Species[]);
        setFilteredSpecies(mockData as Species[]);
      }
    }
    loadData();
  }, []);

  // Client-side filtering logic
  useEffect(() => {
    let result = speciesList;

    if (selectedHabitat) {
      result = result.filter(s => s.habitat.toLowerCase() === selectedHabitat.toLowerCase());
    }
    if (selectedRegion) {
      result = result.filter(s => s.region.toLowerCase() === selectedRegion.toLowerCase());
    }
    if (selectedStatus) {
      result = result.filter(s => s.status.toUpperCase() === selectedStatus.toUpperCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.common_name.toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q));
    }

    setFilteredSpecies(result);
  }, [selectedHabitat, selectedRegion, selectedStatus, searchQuery, speciesList]);

  const handleSemanticSearch = async (query: string) => {
    if (!query || query.length < 3) return;
    setIsSearchingAI(true);
    try {
      const res = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const filters = await res.json();
      if (filters.habitat) setSelectedHabitat(filters.habitat);
      if (filters.status) setSelectedStatus(filters.status);
      if (filters.region) setSelectedRegion(filters.region);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleSimulateRipple = (species: Species) => {
    setActiveRippleSpecies(species);
    const affected = speciesList
      .filter(s => s.id !== species.id && (s.habitat === species.habitat || species.dependencies?.includes(s.common_name)))
      .map(s => s.id);
    setAffectedIds(affected);
  };

  const handleResetFilters = () => {
    setSelectedHabitat('');
    setSelectedRegion('');
    setSelectedStatus('');
    setSearchQuery('');
    setActiveRippleSpecies(null);
    setAffectedIds([]);
  };

  const habitats = Array.from(new Set(speciesList.map(s => s.habitat)));
  const regions = Array.from(new Set(speciesList.map(s => s.region)));

  return (
    <main className="min-h-screen bg-keystone-bg">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        userLocation="Bengaluru, India (42 endangered species within 50 miles)"
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSemanticSearch={handleSemanticSearch}
          isSearchingAI={isSearchingAI}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <SidebarFilters
              selectedHabitat={selectedHabitat}
              setSelectedHabitat={setSelectedHabitat}
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              habitats={habitats}
              regions={regions}
              onReset={handleResetFilters}
            />
          </div>

          <div className="lg:col-span-3">
            {currentView === 'grid' && (
              <SpeciesGrid
                speciesList={filteredSpecies}
                affectedSpeciesIds={affectedIds}
                onSimulateRipple={handleSimulateRipple}
                onClearFilters={handleResetFilters}
              />
            )}
            {currentView === 'map' && <MapBox speciesList={filteredSpecies} />}
            {currentView === 'network' && (
              <NetworkView
                speciesList={filteredSpecies}
                onSelectSpecies={(s) => {
                  window.location.href = `/species/${s.id}`;
                }}
              />
            )}
          </div>
        </div>
      </div>

      <ExtinctionRipple
        targetSpecies={activeRippleSpecies}
        affectedCount={affectedIds.length}
        onClose={() => {
          setActiveRippleSpecies(null);
          setAffectedIds([]);
        }}
      />

      <FieldScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSpeciesIdentified={(species) => {
          setSpeciesList((prev) => [species, ...prev]);
          window.location.href = `/species/${species.id}`;
        }}
      />
    </main>
  );
}