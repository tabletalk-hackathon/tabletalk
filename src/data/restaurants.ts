import { Restaurant, LocationData } from '@/types';
import axios from 'axios';

interface OSMElement {
  id: number;
  type: string;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  geometry?: Array<{
    lat: number;
    lon: number;
  }>;
}

interface OSMResponse {
  elements: OSMElement[];
}

interface OSMPlace {
  id: number;
  type: string;
  tags: Record<string, string>;
  amenity: string;
  name: string;
  cuisine?: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
  addr_street?: string;
  addr_housenumber?: string;
  addr_city?: string;
  lat?: number;
  lon?: number;
}

class OSMClient {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  async findNearbyPlaces(
    latitude: number, 
    longitude: number, 
    radius = 500, 
    limit = 10
  ): Promise<OSMPlace[]> {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"](around:${radius},${latitude},${longitude});
        way["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"](around:${radius},${latitude},${longitude});
        relation["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"](around:${radius},${latitude},${longitude});
      );
      out geom;
    `;

    try {
      const response = await axios.post(this.overpassUrl, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000
      });

      const data = response.data as OSMResponse;
      const places: OSMPlace[] = [];

      for (const element of data.elements || []) {
        if (['node', 'way', 'relation'].includes(element.type)) {
          const tags = element.tags || {};
          const amenity = tags.amenity;
          
          if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub'].includes(amenity)) {
            const place: OSMPlace = {
              id: element.id,
              type: element.type,
              tags,
              amenity,
              name: tags.name || 'Unnamed',
              cuisine: tags.cuisine,
              phone: tags.phone || tags['contact:phone'],
              website: tags.website || tags['contact:website'],
              opening_hours: tags['opening_hours'],
              addr_street: tags['addr:street'],
              addr_housenumber: tags['addr:housenumber'],
              addr_city: tags['addr:city']
            };

            if (element.type === 'node') {
              place.lat = element.lat;
              place.lon = element.lon;
            } else if (['way', 'relation'].includes(element.type) && element.center) {
              place.lat = element.center.lat;
              place.lon = element.center.lon;
            } else if (element.type === 'way' && element.geometry) {
              const coords = element.geometry;
              if (coords.length > 0) {
                const avgLat = coords.reduce((sum: number, coord: any) => sum + coord.lat, 0) / coords.length;
                const avgLon = coords.reduce((sum: number, coord: any) => sum + coord.lon, 0) / coords.length;
                place.lat = avgLat;
                place.lon = avgLon;
              }
            }

            if (place.lat && place.lon) {
              places.push(place);
            }
          }
        }
      }

      return limit ? places.slice(0, limit) : places;
    } catch (error) {
      console.error(`Failed to query Overpass API: ${error}`);
      throw error;
    }
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function mapAmenityToCuisine(amenity: string, cuisine?: string): string {
  if (cuisine) return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
  
  switch (amenity) {
    case 'restaurant': return 'International';
    case 'cafe': return 'Cafe';
    case 'fast_food': return 'Fast Food';
    case 'bar': return 'Bar';
    case 'pub': return 'Pub';
    default: return 'Restaurant';
  }
}

function mapAmenityToAmbiance(amenity: string): string {
  switch (amenity) {
    case 'restaurant': return 'casual';
    case 'cafe': return 'casual';
    case 'fast_food': return 'casual';
    case 'bar': return 'lively';
    case 'pub': return 'casual';
    default: return 'casual';
  }
}

function generatePriceRange(): '€' | '€€' | '€€€' {
  const ranges: ('€' | '€€' | '€€€')[] = ['€', '€€', '€€€'];
  return ranges[Math.floor(Math.random() * ranges.length)];
}

function convertOSMToRestaurant(osmPlace: OSMPlace, userLocation: LocationData): Restaurant {
  const address = [
    osmPlace.addr_street && osmPlace.addr_housenumber 
      ? `${osmPlace.addr_street} ${osmPlace.addr_housenumber}`
      : osmPlace.addr_street,
    osmPlace.addr_city
  ].filter(Boolean).join(', ') || 'Address not available';

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    osmPlace.lat!,
    osmPlace.lon!
  );

  return {
    id: `osm-${osmPlace.id}`,
    name: osmPlace.name,
    address,
    cuisineType: mapAmenityToCuisine(osmPlace.amenity, osmPlace.cuisine),
    priceRange: generatePriceRange(),
    rating: 3.5 + Math.random() * 1.5,
    dietaryOptions: [],
    ambianceType: mapAmenityToAmbiance(osmPlace.amenity),
    phoneNumber: osmPlace.phone || 'Not available',
    distanceFromUser: Math.round(distance * 10) / 10,
    coordinates: { lat: osmPlace.lat!, lng: osmPlace.lon! }
  };
}

export async function fetchNearbyRestaurants(
  location: LocationData,
  radius = 500,
  limit = 10
): Promise<Restaurant[]> {
  const osmClient = new OSMClient();
  
  try {
    const osmPlaces = await osmClient.findNearbyPlaces(
      location.latitude,
      location.longitude,
      radius,
      limit
    );

    return osmPlaces.map(place => convertOSMToRestaurant(place, location));
  } catch (error) {
    console.error('Failed to fetch restaurants from OSM:', error);
    return mockRestaurants;
  }
}

export const mockRestaurants: Restaurant[] = [
  {
    id: 'rest-001',
    name: 'Café de Reiger',
    address: 'Nieuwe Leliestraat 34, 1015 SZ Amsterdam',
    cuisineType: 'Dutch',
    priceRange: '€€',
    rating: 4.5,
    dietaryOptions: ['vegetarian', 'gluten-free'],
    ambianceType: 'casual',
    phoneNumber: '+31 20 624 7426',
    distanceFromUser: 0.8,
    coordinates: { lat: 52.3676, lng: 4.8852 }
  },
  {
    id: 'rest-002',
    name: 'Restaurant Greetje',
    address: 'Peperstraat 23-25, 1011 TJ Amsterdam',
    cuisineType: 'Modern Dutch',
    priceRange: '€€€',
    rating: 4.8,
    dietaryOptions: ['vegetarian', 'vegan'],
    ambianceType: 'fine dining',
    phoneNumber: '+31 20 779 7450',
    distanceFromUser: 1.2,
    coordinates: { lat: 52.3702, lng: 4.8952 }
  },
  {
    id: 'rest-003',
    name: 'Toscanini',
    address: 'Lindengracht 75, 1015 KD Amsterdam',
    cuisineType: 'Italian',
    priceRange: '€€€',
    rating: 4.6,
    dietaryOptions: ['vegetarian'],
    ambianceType: 'romantic',
    phoneNumber: '+31 20 623 2813',
    distanceFromUser: 0.6,
    coordinates: { lat: 52.3745, lng: 4.8845 }
  }
];

// Amsterdam Rewire coordinates as fallback
export const FALLBACK_LOCATION = {
  latitude: 52.361133,
  longitude: 4.918611
};