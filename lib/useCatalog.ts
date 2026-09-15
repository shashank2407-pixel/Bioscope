'use client';
import { useEffect, useMemo, useState } from 'react';
import { CATALOG } from './catalog';
import { normalizeHabitat, normalizeStatus, type Species } from './ecosystem';
import { supabase } from './supabase';

const SCANS_KEY = 'keystone:scans:v1';
const SCANS_EVENT = 'keystone:scans-changed';
const MAX_SCANS = 24;

export function readScans(): Species[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SCANS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScans(scans: Species[]) {
  let list = scans.slice(0, MAX_SCANS);
  // Photos are stored inline, so drop the oldest scans until the list fits the storage quota.
  while (list.length > 0) {
    try {
      localStorage.setItem(SCANS_KEY, JSON.stringify(list));
      break;
    } catch {
      list = list.slice(0, -1);
    }
  }
  window.dispatchEvent(new Event(SCANS_EVENT));
}

export function saveScan(species: Species) {
  writeScans([species, ...readScans().filter((s) => s.id !== species.id)]);
}

export function removeScan(id: string) {
  const next = readScans().filter((s) => s.id !== id);
  try {
    localStorage.setItem(SCANS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(SCANS_EVENT));
}

function normalizeRemote(row: Record<string, unknown>): Species | null {
  if (!row?.id || !row?.common_name || !row?.scientific_name) return null;
  return {
    ...(row as unknown as Species),
    id: String(row.id),
    status: normalizeStatus(row.status),
    habitat: normalizeHabitat(row.habitat),
    latitude: Number(row.latitude) || 0,
    longitude: Number(row.longitude) || 0,
    source: 'catalog',
  };
}

let remotePromise: Promise<Species[]> | null = null;

function fetchRemote(): Promise<Species[]> {
  if (!supabase) return Promise.resolve([]);
  remotePromise ??= (async () => {
    try {
      const { data, error } = await supabase.from('species').select('*');
      if (error) throw error;
      return (data ?? []).map(normalizeRemote).filter((s): s is Species => s !== null);
    } catch (err) {
      console.warn('[catalog] Supabase unavailable, using built-in catalog.', err);
      return [];
    }
  })();
  return remotePromise;
}

/** Curated entries win; Supabase rows add species the curated list doesn't have (deduped by scientific name). */
function mergeCatalog(remote: Species[]): Species[] {
  const byName = new Map<string, Species>();
  for (const s of CATALOG) byName.set(s.scientific_name.toLowerCase(), { ...s, source: 'catalog' });
  for (const s of remote) {
    const key = s.scientific_name.toLowerCase();
    if (!byName.has(key)) byName.set(key, s);
  }
  return [...byName.values()];
}

export function useCatalog() {
  const [remote, setRemote] = useState<Species[]>([]);
  const [scans, setScans] = useState<Species[]>([]);
  const [scansLoaded, setScansLoaded] = useState(false);
  const [remoteLoaded, setRemoteLoaded] = useState(!supabase);

  useEffect(() => {
    let alive = true;
    const sync = () => {
      setScans(readScans());
      setScansLoaded(true);
    };
    sync();
    window.addEventListener(SCANS_EVENT, sync);
    window.addEventListener('storage', sync);
    fetchRemote().then((rows) => {
      if (!alive) return;
      setRemote(rows);
      setRemoteLoaded(true);
    });
    return () => {
      alive = false;
      window.removeEventListener(SCANS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const catalog = useMemo(() => mergeCatalog(remote), [remote]);
  const all = useMemo(() => [...scans, ...catalog], [scans, catalog]);

  return { catalog, scans, all, ready: scansLoaded && remoteLoaded, removeScan };
}
