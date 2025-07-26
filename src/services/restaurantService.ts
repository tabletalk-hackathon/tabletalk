import { Restaurant, LocationData } from '@/types';
import { osmService } from './osmService';
import { locationService } from './locationService';
import { logger } from '@/utils/logger';

export class RestaurantService {
  /**
   * Find nearby restaurants using OSM data
   */
  async findNearbyRestaurants(
    location: LocationData,
    radius: number = 1000, // 1km default radius
    limit: number = 20
  ): Promise<Restaurant[]> {
    try {
      logger.search('Finding nearby restaurants using OSM', {
        location: `${location.latitude}, ${location.longitude}`,
        radius: `${radius}m`,
        limit
      });

      // Get OSM data
      const osmResult = await osmService.findNearbyRestaurants(
        location.latitude,
        location.longitude,
        radius,
        limit
      );

      if (osmResult.status === 'error') {
        logger.error('OSM service returned error', osmResult.error);
        return [];
      }

      if (osmResult.restaurants.length === 0) {
        logger.search('No restaurants found in the area, trying larger radius');
        
        // Try with a larger radius if no results
        const expandedResult = await osmService.findNearbyRestaurants(
          location.latitude,
          location.longitude,
          radius * 2, // Double the radius
          limit
        );

        if (expandedResult.status === 'success' && expandedResult.restaurants.length > 0) {
          return expandedResult.restaurants.map(osmPlace => 
            osmService.convertToRestaurant(osmPlace)
          );
        }

        return [];
      }

      // Convert OSM places to Restaurant objects
      const restaurants = osmResult.restaurants.map(osmPlace => 
        osmService.convertToRestaurant(osmPlace)
      );

      logger.search(`Successfully converted ${restaurants.length} OSM places to restaurants`);

      return restaurants;

    } catch (error) {
      logger.error('Error in restaurant service', error);
      return [];
    }
  }

  /**
   * Get restaurants with fallback to mock data if OSM fails
   */
  async getRestaurantsWithFallback(
    location: LocationData,
    radius: number = 1000,
    limit: number = 20
  ): Promise<Restaurant[]> {
    try {
      // Try to get real OSM data first
      const osmRestaurants = await this.findNearbyRestaurants(location, radius, limit);
      
      if (osmRestaurants.length > 0) {
        logger.search(`Using ${osmRestaurants.length} real restaurants from OSM`);
        return osmRestaurants;
      }

      // Fallback to mock data if OSM returns no results
      logger.search('No OSM restaurants found, falling back to mock data');
      return this.getMockRestaurantsWithDistance(location);

    } catch (error) {
      logger.error('Error getting restaurants, falling back to mock data', error);
      return this.getMockRestaurantsWithDistance(location);
    }
  }

  /**
   * Get mock restaurants with updated distances (fallback method)
   */
  private getMockRestaurantsWithDistance(location: LocationData): Restaurant[] {
    // Import mock data dynamically to avoid circular dependencies
    const { mockRestaurants } = require('@/data/restaurants');
    
    return mockRestaurants.map((restaurant: Restaurant) => ({
      ...restaurant,
      distanceFromUser: locationService.calculateDistance(
        location.latitude,
        location.longitude,
        restaurant.coordinates.lat,
        restaurant.coordinates.lng
      )
    }));
  }

  /**
   * Filter restaurants by various criteria
   */
  filterRestaurants(
    restaurants: Restaurant[],
    filters: {
      maxDistance?: number;
      cuisineTypes?: string[];
      priceRanges?: string[];
      dietaryOptions?: string[];
      minRating?: number;
    }
  ): Restaurant[] {
    return restaurants.filter(restaurant => {
      // Distance filter
      if (filters.maxDistance && restaurant.distanceFromUser > filters.maxDistance) {
        return false;
      }

      // Cuisine filter
      if (filters.cuisineTypes && filters.cuisineTypes.length > 0) {
        if (!filters.cuisineTypes.includes(restaurant.cuisineType)) {
          return false;
        }
      }

      // Price range filter
      if (filters.priceRanges && filters.priceRanges.length > 0) {
        if (!filters.priceRanges.includes(restaurant.priceRange)) {
          return false;
        }
      }

      // Dietary options filter
      if (filters.dietaryOptions && filters.dietaryOptions.length > 0) {
        const hasRequiredDietaryOption = filters.dietaryOptions.some(option =>
          restaurant.dietaryOptions.includes(option)
        );
        if (!hasRequiredDietaryOption) {
          return false;
        }
      }

      // Rating filter
      if (filters.minRating && restaurant.rating < filters.minRating) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort restaurants by various criteria
   */
  sortRestaurants(
    restaurants: Restaurant[],
    sortBy: 'distance' | 'rating' | 'name' | 'price' = 'distance'
  ): Restaurant[] {
    const sorted = [...restaurants];

    switch (sortBy) {
      case 'distance':
        return sorted.sort((a, b) => a.distanceFromUser - b.distanceFromUser);
      
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'price':
        const priceOrder = { '€': 1, '€€': 2, '€€€': 3 };
        return sorted.sort((a, b) => priceOrder[a.priceRange] - priceOrder[b.priceRange]);
      
      default:
        return sorted;
    }
  }

  /**
   * Get restaurant statistics for debugging
   */
  getRestaurantStats(restaurants: Restaurant[]) {
    const stats = {
      total: restaurants.length,
      cuisineTypes: {} as { [key: string]: number },
      priceRanges: {} as { [key: string]: number },
      averageDistance: 0,
      averageRating: 0
    };

    restaurants.forEach(restaurant => {
      // Count cuisine types
      stats.cuisineTypes[restaurant.cuisineType] = 
        (stats.cuisineTypes[restaurant.cuisineType] || 0) + 1;

      // Count price ranges
      stats.priceRanges[restaurant.priceRange] = 
        (stats.priceRanges[restaurant.priceRange] || 0) + 1;
    });

    // Calculate averages
    if (restaurants.length > 0) {
      stats.averageDistance = restaurants.reduce((sum, r) => sum + r.distanceFromUser, 0) / restaurants.length;
      stats.averageRating = restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length;
    }

    return stats;
  }
}

export const restaurantService = new RestaurantService();