export interface OSMPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tags: {
    [key: string]: string | undefined;
    amenity?: string;
    cuisine?: string;
    phone?: string;
    'contact:phone'?: string;
    website?: string;
    'contact:website'?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    opening_hours?: string;
    wheelchair?: string;
    outdoor_seating?: string;
    takeaway?: string;
    delivery?: string;
  };
  distance?: number;
}

export interface OSMResponse {
  categories: {
    amenity: {
      [subcategory: string]: OSMPlace[];
    };
  };
}

export interface OSMSearchResult {
  status: 'success' | 'error';
  location: {
    latitude: number;
    longitude: number;
  };
  restaurants_found: number;
  restaurants: OSMPlace[];
  error?: string;
}

export interface EnhancedOSMPlace extends OSMPlace {
  phone?: string;
  website?: string;
  address?: string;
  cuisineType?: string;
  amenityType?: string;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    [key: string]: string | undefined;
    amenity?: string;
    cuisine?: string;
    name?: string;
    phone?: string;
    'contact:phone'?: string;
    website?: string;
    'contact:website'?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    opening_hours?: string;
    wheelchair?: string;
    outdoor_seating?: string;
    takeaway?: string;
    delivery?: string;
  };
}

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}