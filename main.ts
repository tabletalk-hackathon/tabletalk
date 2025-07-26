#!/usr/bin/env node

/**
 * Script to interact with OpenStreetMap data and Mistral AI
 * Direct OSM Overpass API integration
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

interface EnvVars {
  [key: string]: string;
}

interface Place {
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

interface OSMElement {
  id: number;
  type: string;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OSMResponse {
  elements: OSMElement[];
}

interface PlacesData {
  categories: {
    amenity: Record<string, Place[]>;
  };
  total_places: number;
}

interface APIResponse {
  result?: {
    content: Array<{ text: string }>;
  };
  error?: {
    message: string;
  };
}

function loadEnvFile(filename: string = '.env'): EnvVars {
  const envVars: EnvVars = {};
  const envPath = path.resolve(filename);
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value;
      }
    }
  }
  return envVars;
}

function setupLogging(logLevel: string = 'INFO'): void {
  const level = logLevel.toUpperCase();
  console.log(`Logging level set to: ${level}`);
}

const envVars = loadEnvFile();

class OSMClient {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  async findNearbyPlaces(
    latitude: number,
    longitude: number,
    radius: number = 500,
    categories: string[] | null = null,
    limit: number = 10
  ): Promise<APIResponse> {
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
      const response = await axios.post<OSMResponse>(
        this.overpassUrl,
        query,
        {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 30000
        }
      );

      const data = response.data;
      const places: Place[] = [];

      for (const element of data.elements || []) {
        if (['node', 'way', 'relation'].includes(element.type)) {
          const tags = element.tags || {};
          const amenity = tags.amenity;

          if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub'].includes(amenity)) {
            const place: Place = {
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
                const avgLat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
                const avgLon = coords.reduce((sum, coord) => sum + coord.lon, 0) / coords.length;
                place.lat = avgLat;
                place.lon = avgLon;
              }
            }

            places.push(place);
          }
        }
      }

      const limitedPlaces = limit ? places.slice(0, limit) : places;

      const categoriesData: { amenity: Record<string, Place[]> } = {
        amenity: {}
      };

      for (const place of limitedPlaces) {
        const amenityType = place.amenity;
        if (!categoriesData.amenity[amenityType]) {
          categoriesData.amenity[amenityType] = [];
        }
        categoriesData.amenity[amenityType].push(place);
      }

      return {
        result: {
          content: [{
            text: JSON.stringify({
              categories: categoriesData,
              total_places: limitedPlaces.length
            })
          }]
        }
      };

    } catch (error) {
      console.error(`❌ Failed to query Overpass API: ${error}`);
      return {
        error: {
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}

class MistralClient {
  private apiKey: string | null;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(envVars: EnvVars) {
    this.apiKey = envVars.MISTRAL_API_KEY || null;
    if (!this.apiKey) {
      console.warn('⚠️  MISTRAL_API_KEY not found in .env file - skipping Mistral integration');
    }
  }

  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Mistral API key not available');
    }

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: 'mistral-small-latest',
        messages
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }
}

async function main(): Promise<any> {
  const osmClient = new OSMClient();
  const mistralClient = new MistralClient(envVars);

  try {
    const lat = 52.3613333; // 52°21'40.8"N
    const lon = 4.9180833;  // 4°55'05.1"E
    console.log(`📍 Using coordinates: ${lat}, ${lon}`);

    console.log('🍽️  Finding nearby restaurants...');
    const restaurantsResponse = await osmClient.findNearbyPlaces(
      lat,
      lon,
      500,
      ['amenity'],
      10
    );

    if (restaurantsResponse.result?.content) {
      const placesData: PlacesData = JSON.parse(restaurantsResponse.result.content[0].text);

      const restaurants: Place[] = [];
      if (placesData.categories?.amenity) {
        for (const [subcategory, places] of Object.entries(placesData.categories.amenity)) {
          if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub'].includes(subcategory)) {
            restaurants.push(...places);
          }
        }
      }

      const result = {
        status: 'success',
        location: {
          latitude: lat,
          longitude: lon
        },
        restaurants_found: restaurants.length,
        restaurants
      };

      console.log(JSON.stringify(result, null, 2));
      return result;
    } else {
      const result = {
        status: 'success',
        location: {
          latitude: lat,
          longitude: lon
        },
        restaurants_found: 0,
        restaurants: []
      };

      console.log(JSON.stringify(result, null, 2));
      return result;
    }

  } catch (error) {
    const result = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };

    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const logLevelIndex = args.indexOf('--log-level');
  const logLevel = logLevelIndex !== -1 && args[logLevelIndex + 1] ? args[logLevelIndex + 1] : 'INFO';
  
  setupLogging(logLevel);
  main().catch(console.error);
}