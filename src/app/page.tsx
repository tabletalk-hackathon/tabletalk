'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { locationService } from '@/services/locationService';
import { userProfileService } from '@/services/userProfileService';
import { llmService } from '@/services/llmService';
import { restaurantService } from '@/services/restaurantService';
import { LocationData, UserProfile, LLMRankingResponse } from '@/types';
import { logger } from '@/utils/logger';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const router = useRouter();

  const handleBookClick = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Get GPS location
      setLoadingMessage('Getting your location...');
      const location: LocationData = await locationService.getCurrentLocation();
      
      // Store location in session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userLocation', JSON.stringify(location));
      }

      // Step 2: Get or create user profile
      setLoadingMessage('Loading your preferences...');
      let userProfile: UserProfile = userProfileService.getProfile() || userProfileService.getDefaultProfile();
      
      // If no profile exists, save the default one
      if (!userProfileService.hasProfile()) {
        userProfileService.saveProfile(userProfile);
      }

      // Step 3: Find nearby restaurants using OSM data
      setLoadingMessage('Finding nearby restaurants...');
      const restaurants = await restaurantService.getRestaurantsWithFallback(
        location,
        1000, // 1km radius
        20    // limit to 20 restaurants
      );

      // Log restaurant statistics for debugging
      const stats = restaurantService.getRestaurantStats(restaurants);
      logger.search('Restaurant search completed', {
        total: stats.total,
        averageDistance: `${stats.averageDistance.toFixed(1)}km`,
        cuisineTypes: Object.keys(stats.cuisineTypes).length,
        priceRanges: stats.priceRanges
      });

      // Step 4: Get LLM ranking
      setLoadingMessage('Analyzing your preferences...');
      const rankingResponse: LLMRankingResponse = await llmService.rankRestaurants(
        restaurants,
        userProfile,
        location
      );

      // Store ranking results in session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('restaurantRanking', JSON.stringify(rankingResponse));
        sessionStorage.setItem('userProfile', JSON.stringify(userProfile));
      }

      // Navigate to restaurant selection
      router.push('/restaurants');

    } catch (error) {
      logger.error('Error during booking process', error);
      setLoadingMessage('Something went wrong. Please try again.');
      setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage('');
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="spinner mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Finding the perfect restaurant for you...
        </h2>
        <p className="text-gray-600 mb-8">{loadingMessage}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
          <p className="text-sm text-blue-800">
            💡 Check your browser console for detailed logs of the AI reasoning process!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          TableTalk
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          AI-powered restaurant reservations
        </p>
        <p className="text-sm text-gray-500">
          Find and book the perfect table in seconds
        </p>
      </div>

      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-sm">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🍽️</div>
            <h3 className="font-semibold text-gray-800">How it works:</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">📍</span>
              We'll find your location
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">🤖</span>
              AI analyzes your preferences
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">📞</span>
              We call restaurants for you
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✅</span>
              Your table is booked!
            </li>
          </ul>
        </div>
      </div>

      <button
        onClick={handleBookClick}
        className="btn-primary text-xl px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        disabled={isLoading}
      >
        BOOK
      </button>

      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
        <p className="text-sm text-green-800">
          <strong>Live Mode:</strong> This app now uses real restaurant data from OpenStreetMap! Restaurant calls are still simulated for demo purposes.
        </p>
      </div>
    </div>
  );
}