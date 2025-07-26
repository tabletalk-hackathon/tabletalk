import { Restaurant, UserProfile, LLMRankingResponse, LocationData } from '@/types';
import { logger } from '@/utils/logger';

export class LLMService {
  async rankRestaurants(
    restaurants: Restaurant[],
    userProfile: UserProfile,
    userLocation: LocationData
  ): Promise<LLMRankingResponse> {
    logger.llm('Starting restaurant ranking process', {
      restaurantCount: restaurants.length,
      userPreferences: userProfile,
      userLocation
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock LLM ranking logic
    const rankedRestaurants = this.mockRankingAlgorithm(restaurants, userProfile);
    
    const reasoning = this.generateMockReasoning(rankedRestaurants, userProfile);
    
    const response: LLMRankingResponse = {
      rankedRestaurants: rankedRestaurants.slice(0, 6), // Top 6 restaurants
      reasoning,
      timestamp: new Date().toISOString()
    };

    logger.llm('Restaurant ranking completed', {
      topRestaurants: response.rankedRestaurants.map(r => r.name),
      reasoning: response.reasoning
    });

    return response;
  }

  private mockRankingAlgorithm(restaurants: Restaurant[], userProfile: UserProfile): Restaurant[] {
    return restaurants
      .map(restaurant => ({
        ...restaurant,
        score: this.calculateRestaurantScore(restaurant, userProfile)
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...restaurant }) => restaurant);
  }

  private calculateRestaurantScore(restaurant: Restaurant, userProfile: UserProfile): number {
    let score = 0;

    // Cuisine preference match (40% weight)
    if (userProfile.cuisinePreferences.includes(restaurant.cuisineType)) {
      score += 40;
    }

    // Price range match (25% weight)
    if (restaurant.priceRange === userProfile.priceRangePreference) {
      score += 25;
    } else if (
      (userProfile.priceRangePreference === '€€' && restaurant.priceRange === '€') ||
      (userProfile.priceRangePreference === '€€€' && restaurant.priceRange === '€€')
    ) {
      score += 15; // Partial match
    }

    // Ambiance match (20% weight)
    if (restaurant.ambianceType === userProfile.ambiancePreference) {
      score += 20;
    }

    // Dietary restrictions (10% weight)
    const matchingDietaryOptions = userProfile.dietaryRestrictions.filter(restriction =>
      restaurant.dietaryOptions.includes(restriction)
    );
    score += (matchingDietaryOptions.length / userProfile.dietaryRestrictions.length) * 10;

    // Rating bonus (5% weight)
    score += restaurant.rating;

    // Distance penalty (closer is better)
    score -= restaurant.distanceFromUser * 2;

    return Math.max(0, score);
  }

  private generateMockReasoning(rankedRestaurants: Restaurant[], userProfile: UserProfile): string {
    const topRestaurant = rankedRestaurants[0];
    
    const reasons = [];
    
    if (userProfile.cuisinePreferences.includes(topRestaurant.cuisineType)) {
      reasons.push(`matches your preferred ${topRestaurant.cuisineType} cuisine`);
    }
    
    if (topRestaurant.priceRange === userProfile.priceRangePreference) {
      reasons.push(`fits your ${userProfile.priceRangePreference} price range preference`);
    }
    
    if (topRestaurant.ambianceType === userProfile.ambiancePreference) {
      reasons.push(`offers the ${userProfile.ambiancePreference} ambiance you prefer`);
    }
    
    const matchingDietary = userProfile.dietaryRestrictions.filter(restriction =>
      topRestaurant.dietaryOptions.includes(restriction)
    );
    
    if (matchingDietary.length > 0) {
      reasons.push(`accommodates your ${matchingDietary.join(', ')} dietary needs`);
    }
    
    reasons.push(`has excellent ${topRestaurant.rating}/5 rating`);
    reasons.push(`is conveniently located ${topRestaurant.distanceFromUser}km away`);

    return `I ranked ${topRestaurant.name} as the top choice because it ${reasons.join(', ')}. The other restaurants were ranked based on similar criteria, balancing your preferences for cuisine type, price range, ambiance, dietary requirements, ratings, and proximity to your location.`;
  }
}

export const llmService = new LLMService();