'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Restaurant, LLMRankingResponse, UserProfile } from '@/types';
import { callingService } from '@/services/callingService';
import { logger } from '@/utils/logger';

export default function RestaurantSelectionPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [otherRestaurants, setOtherRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<Restaurant[]>([]);
  const [showOthers, setShowOthers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Load data from session storage
    if (typeof window !== 'undefined') {
      const rankingData = sessionStorage.getItem('restaurantRanking');
      const profileData = sessionStorage.getItem('userProfile');
      
      if (rankingData) {
        const ranking: LLMRankingResponse = JSON.parse(rankingData);
        setRestaurants(ranking.rankedRestaurants.slice(0, 3)); // Top 3
        setOtherRestaurants(ranking.rankedRestaurants.slice(3, 6)); // Next 3
      }
      
      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      }
      
      // If no data, redirect back to home
      if (!rankingData || !profileData) {
        router.push('/');
      }
    }
  }, [router]);

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurants(prev => {
      const isSelected = prev.some(r => r.id === restaurant.id);
      if (isSelected) {
        // Remove restaurant if already selected
        const updated = prev.filter(r => r.id !== restaurant.id);
        logger.search('Restaurant deselected', {
          restaurant: restaurant.name,
          remainingCount: updated.length
        });
        return updated;
      } else {
        // Add restaurant to selection
        const updated = [...prev, restaurant];
        logger.search('Restaurant selected for booking', {
          restaurant: restaurant.name,
          cuisine: restaurant.cuisineType,
          priceRange: restaurant.priceRange,
          totalSelected: updated.length
        });
        return updated;
      }
    });
  };

  const isRestaurantSelected = (restaurant: Restaurant) => {
    return selectedRestaurants.some(r => r.id === restaurant.id);
  };

  const handleOkClick = async () => {
    if (selectedRestaurants.length === 0 || !userProfile) return;

    setIsLoading(true);
    setLoadingMessage('Calling selected restaurants to make your reservation...');

    try {
      // Use only the selected restaurants for calling
      const restaurantsToCall = [...selectedRestaurants];

      logger.call('Starting booking process with selected restaurants', {
        selectedRestaurants: restaurantsToCall.map(r => r.name),
        count: restaurantsToCall.length
      });

      const bookingResult = await callingService.callRestaurants(
        restaurantsToCall,
        userProfile.name,
        userProfile.surname
      );

      if (bookingResult) {
        // Store booking details
        sessionStorage.setItem('bookingDetails', JSON.stringify(bookingResult));
        router.push('/confirmation');
      } else {
        setLoadingMessage('Sorry, none of the selected restaurants have availability tonight. Please try again later.');
        setTimeout(() => {
          setIsLoading(false);
          setLoadingMessage('');
        }, 3000);
      }

    } catch (error) {
      logger.error('Error during restaurant calling process', error);
      setLoadingMessage('Something went wrong. Please try again.');
      setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage('');
      }, 2000);
    }
  };

  const handleOtherClick = () => {
    setShowOthers(true);
    setSelectedRestaurants([]);
    logger.search('User requested to see other restaurant options');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="spinner mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Making your reservation...
        </h2>
        <p className="text-gray-600 mb-8">{loadingMessage}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
          <p className="text-sm text-blue-800">
            💡 Watch the console for live call transcripts!
          </p>
        </div>
      </div>
    );
  }

  const displayRestaurants = showOthers ? otherRestaurants : restaurants;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {showOthers ? 'Other Options' : 'Recommended Restaurants'}
        </h1>
        <p className="text-gray-600">
          {showOthers 
            ? 'Here are more restaurants that match your preferences:'
            : 'Based on your preferences, here are our top recommendations:'
          }
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {displayRestaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            className={`card cursor-pointer transition-all duration-200 ${
              isRestaurantSelected(restaurant)
                ? 'ring-2 ring-primary-500 bg-primary-50'
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleRestaurantSelect(restaurant)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div
                    className="mr-3 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestaurantSelect(restaurant);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isRestaurantSelected(restaurant)}
                      onChange={() => {}} // Controlled by onClick above
                      className="h-4 w-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {restaurant.name}
                  </h3>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="flex items-center">
                    <span className="font-medium mr-2">Cuisine:</span>
                    {restaurant.cuisineType}
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium mr-2">Price:</span>
                    <span className="text-green-600 font-medium">{restaurant.priceRange}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium mr-2">Rating:</span>
                    <span className="text-yellow-600">{'★'.repeat(Math.floor(restaurant.rating))}</span>
                    <span className="ml-1">{restaurant.rating}/5</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium mr-2">Distance:</span>
                    {restaurant.distanceFromUser}km away
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {restaurant.address}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleOkClick}
          disabled={selectedRestaurants.length === 0}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          OK ({selectedRestaurants.length} selected)
        </button>
        
        {!showOthers && (
          <button
            onClick={handleOtherClick}
            className="btn-secondary flex-1"
          >
            OTHER
          </button>
        )}
        
        {showOthers && (
          <button
            onClick={() => {
              setShowOthers(false);
              setSelectedRestaurants([]);
            }}
            className="btn-secondary flex-1"
          >
            BACK
          </button>
        )}
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>How it works:</strong> Select one or more restaurants using the checkboxes and click OK.
          We'll call only the restaurants you've selected in order until we secure your table.
          This gives you full control over which restaurants to contact.
        </p>
      </div>
    </div>
  );
}