#!/usr/bin/env node
"use strict";
/**
 * Script to interact with OpenStreetMap data and Mistral AI
 * Direct OSM Overpass API integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
function loadEnvFile(filename = '.env') {
    const envVars = {};
    const envPath = path_1.default.resolve(filename);
    if (fs_1.default.existsSync(envPath)) {
        const content = fs_1.default.readFileSync(envPath, 'utf8');
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
function setupLogging(logLevel = 'INFO') {
    const level = logLevel.toUpperCase();
    console.log(`Logging level set to: ${level}`);
}
const envVars = loadEnvFile();
class OSMClient {
    constructor() {
        this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    }
    async findNearbyPlaces(latitude, longitude, radius = 500, categories = null, limit = 10) {
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
            const response = await axios_1.default.post(this.overpassUrl, query, {
                headers: { 'Content-Type': 'text/plain' },
                timeout: 30000
            });
            const data = response.data;
            const places = [];
            for (const element of data.elements || []) {
                if (['node', 'way', 'relation'].includes(element.type)) {
                    const tags = element.tags || {};
                    const amenity = tags.amenity;
                    if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub'].includes(amenity)) {
                        const place = {
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
                        }
                        else if (['way', 'relation'].includes(element.type) && element.center) {
                            place.lat = element.center.lat;
                            place.lon = element.center.lon;
                        }
                        else if (element.type === 'way' && element.geometry) {
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
            const categoriesData = {
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
        }
        catch (error) {
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
    constructor(envVars) {
        this.baseUrl = 'https://api.mistral.ai/v1';
        this.apiKey = envVars.MISTRAL_API_KEY || null;
        if (!this.apiKey) {
            console.warn('⚠️  MISTRAL_API_KEY not found in .env file - skipping Mistral integration');
        }
    }
    async chatCompletion(messages) {
        if (!this.apiKey) {
            throw new Error('Mistral API key not available');
        }
        const response = await axios_1.default.post(`${this.baseUrl}/chat/completions`, {
            model: 'mistral-small-latest',
            messages
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
}
async function main() {
    const osmClient = new OSMClient();
    const mistralClient = new MistralClient(envVars);
    try {
        const lat = 52.3613333; // 52°21'40.8"N
        const lon = 4.9180833; // 4°55'05.1"E
        console.log(`📍 Using coordinates: ${lat}, ${lon}`);
        console.log('🍽️  Finding nearby restaurants...');
        const restaurantsResponse = await osmClient.findNearbyPlaces(lat, lon, 500, ['amenity'], 10);
        if (restaurantsResponse.result?.content) {
            const placesData = JSON.parse(restaurantsResponse.result.content[0].text);
            const restaurants = [];
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
        }
        else {
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
    }
    catch (error) {
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
