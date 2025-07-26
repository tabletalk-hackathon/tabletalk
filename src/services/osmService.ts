import axios from 'axios';
import { OSMPlace, OSMSearchResult, EnhancedOSMPlace } from '@/types/osm';
import { Restaurant } from '@/types';
import { locationService } from './locationService';
import { logger } from '@/utils/logger';

export class OSMService {
  private readonly overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  /**
   * Find nearby restaurants using Overpass API
   */
  async findNearbyRestaurants(
    latitude: number, 
    longitude: number, 
    radius: number = 500,
    limit: number = 20
  ): Promise<OSMSearchResult> {
    try {
      logger.search('Searching for nearby restaurants via OSM', {
        coordinates: `${latitude}, ${longitude}`,
        radius: `${radius}m`,
        limit
      });

      // Overpass query to find restaurants, cafes, fast food, bars, and pubs
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"](around:${radius},${latitude},${longitude});
          way["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"](around:${radius},${latitude},${longitude});
          relation["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"](around:${radius},${latitude},${longitude});
        );
        out center meta;
      `;

      const response = await axios.post(this.overpassUrl, query, {
        headers: {
          'Content-Type': 'text/plain',
        },
        timeout: 30000, // 30 second timeout
      });

      const data = response.data;
      
      if (!data.elements || data.elements.length === 0) {
        logger.search('No restaurants found in the area');
        return {
          status: 'success',
          location: { latitude, longitude },
          restaurants_found: 0,
          restaurants: []
        };
      }

      // Process and enhance the results
      const enhancedRestaurants = this.processOverpassResults(data.elements, latitude, longitude);
      
      // Sort by distance and limit results
      const sortedRestaurants = enhancedRestaurants
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, limit);

      logger.search(`Found ${sortedRestaurants.length} restaurants`, {
        total_found: enhancedRestaurants.length,
        returned: sortedRestaurants.length
      });

      return {
        status: 'success',
        location: { latitude, longitude },
        restaurants_found: sortedRestaurants.length,
        restaurants: sortedRestaurants
      };

    } catch (error) {
      logger.error('Error fetching restaurants from OSM', error);
      return {
        status: 'error',
        location: { latitude, longitude },
        restaurants_found: 0,
        restaurants: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process Overpass API results and enhance with additional data
   */
  private processOverpassResults(elements: any[], userLat: number, userLon: number): EnhancedOSMPlace[] {
    return elements.map(element => {
      // Get coordinates (handle different element types)
      let lat: number, lon: number;
      if (element.lat && element.lon) {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        // Skip elements without coordinates
        return null;
      }

      // Calculate distance
      const distance = locationService.calculateDistance(userLat, userLon, lat, lon);

      // Extract and enhance data
      const tags = element.tags || {};
      const phone = tags.phone || tags['contact:phone'];
      const website = tags.website || tags['contact:website'];
      
      // Build address from OSM tags
      const address = this.buildAddress(tags);
      
      // Map cuisine type
      const cuisineType = this.mapCuisineType(tags.cuisine, tags.amenity);
      
      const enhancedPlace: EnhancedOSMPlace = {
        id: element.id?.toString() || `osm-${Date.now()}-${Math.random()}`,
        name: tags.name || `${tags.amenity || 'Restaurant'} (Unnamed)`,
        lat,
        lon,
        tags,
        distance,
        phone,
        website,
        address,
        cuisineType,
        amenityType: tags.amenity
      };

      return enhancedPlace;
    }).filter((place): place is EnhancedOSMPlace => place !== null);
  }

  /**
   * Build a readable address from OSM tags
   */
  private buildAddress(tags: any): string {
    const parts: string[] = [];
    
    if (tags['addr:housenumber'] && tags['addr:street']) {
      parts.push(`${tags['addr:street']} ${tags['addr:housenumber']}`);
    } else if (tags['addr:street']) {
      parts.push(tags['addr:street']);
    }
    
    if (tags['addr:postcode'] && tags['addr:city']) {
      parts.push(`${tags['addr:postcode']} ${tags['addr:city']}`);
    } else if (tags['addr:city']) {
      parts.push(tags['addr:city']);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  }

  /**
   * Map OSM cuisine types to our app's cuisine categories
   */
  private mapCuisineType(cuisine?: string, amenity?: string): string {
    if (cuisine) {
      const cuisineMap: { [key: string]: string } = {
        'italian': 'Italian',
        'french': 'French',
        'chinese': 'Chinese',
        'japanese': 'Japanese',
        'indian': 'Indian',
        'thai': 'Thai',
        'mexican': 'Mexican',
        'american': 'American',
        'mediterranean': 'Mediterranean',
        'greek': 'Greek',
        'turkish': 'Turkish',
        'vietnamese': 'Vietnamese',
        'korean': 'Korean',
        'spanish': 'Spanish',
        'german': 'German',
        'dutch': 'Dutch',
        'international': 'International',
        'regional': 'Regional'
      };
      
      const mapped = cuisineMap[cuisine.toLowerCase()];
      if (mapped) return mapped;
    }
    
    // Fallback based on amenity type
    switch (amenity) {
      case 'restaurant': return 'International';
      case 'cafe': return 'Cafe';
      case 'fast_food': return 'Fast Food';
      case 'bar': return 'Bar';
      case 'pub': return 'Pub';
      default: return 'Restaurant';
    }
  }

  /**
   * Convert OSM place to our Restaurant type
   */
  convertToRestaurant(osmPlace: EnhancedOSMPlace): Restaurant {
    // Generate a price range based on amenity type (this is a rough estimation)
    const priceRange = this.estimatePriceRange(osmPlace.amenityType, osmPlace.tags);
    
    // Generate a rating (in real app, this would come from reviews API)
    const rating = this.generateEstimatedRating();
    
    // Map dietary options from tags
    const dietaryOptions = this.extractDietaryOptions(osmPlace.tags);
    
    // Determine ambiance type
    const ambianceType = this.determineAmbianceType(osmPlace.amenityType, osmPlace.tags);

    return {
      id: `osm-${osmPlace.id}`,
      name: osmPlace.name,
      address: osmPlace.address || 'Address not available',
      cuisineType: osmPlace.cuisineType || 'International',
      priceRange,
      rating,
      dietaryOptions,
      ambianceType,
      phoneNumber: osmPlace.phone || 'Phone not available',
      distanceFromUser: osmPlace.distance || 0,
      coordinates: {
        lat: osmPlace.lat,
        lng: osmPlace.lon
      }
    };
  }

  /**
   * Estimate price range based on amenity type and tags
   */
  private estimatePriceRange(amenityType?: string, tags?: any): '€' | '€€' | '€€€' {
    // Check for explicit price information in tags
    if (tags?.['price:range']) {
      const priceRange = tags['price:range'].toLowerCase();
      if (priceRange.includes('expensive') || priceRange.includes('high')) return '€€€';
      if (priceRange.includes('moderate') || priceRange.includes('medium')) return '€€';
      if (priceRange.includes('cheap') || priceRange.includes('low')) return '€';
    }

    // Estimate based on amenity type
    switch (amenityType) {
      case 'fast_food':
      case 'cafe':
        return '€';
      case 'bar':
      case 'pub':
        return '€€';
      case 'restaurant':
      default:
        return '€€'; // Default to moderate pricing
    }
  }

  /**
   * Generate an estimated rating (in a real app, this would come from reviews)
   */
  private generateEstimatedRating(): number {
    // Generate a rating between 3.5 and 4.8
    return Math.round((3.5 + Math.random() * 1.3) * 10) / 10;
  }

  /**
   * Extract dietary options from OSM tags
   */
  private extractDietaryOptions(tags?: any): string[] {
    const options: string[] = [];
    
    if (tags?.['diet:vegetarian'] === 'yes') options.push('vegetarian');
    if (tags?.['diet:vegan'] === 'yes') options.push('vegan');
    if (tags?.['diet:gluten_free'] === 'yes') options.push('gluten-free');
    if (tags?.['diet:halal'] === 'yes') options.push('halal');
    if (tags?.['diet:kosher'] === 'yes') options.push('kosher');
    
    // If no specific dietary info, add some defaults based on cuisine
    if (options.length === 0) {
      options.push('vegetarian'); // Most restaurants have some vegetarian options
    }
    
    return options;
  }

  /**
   * Determine ambiance type based on amenity and tags
   */
  private determineAmbianceType(amenityType?: string, tags?: any): string {
    // Check for explicit ambiance tags
    if (tags?.atmosphere) {
      return tags.atmosphere;
    }
    
    // Determine based on amenity type
    switch (amenityType) {
      case 'fast_food':
        return 'casual';
      case 'cafe':
        return 'casual';
      case 'bar':
      case 'pub':
        return 'casual';
      case 'restaurant':
        // Check for fine dining indicators
        if (tags?.cuisine === 'french' || tags?.['restaurant:type'] === 'fine_dining') {
          return 'fine dining';
        }
        if (tags?.outdoor_seating === 'yes') {
          return 'romantic';
        }
        return 'casual';
      default:
        return 'casual';
    }
  }
}

export const osmService = new OSMService();