export interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  description: string;
  image_url: string;
  habitat: string;
  region: string;
  status: 'LC' | 'VU' | 'EN' | 'CR';
  latitude: number;
  longitude: number;
  taxonomy?: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
  };
  ecological_role?: string;
  dependencies?: string[];
}