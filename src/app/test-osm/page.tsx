'use client';

import { useState } from 'react';
import { restaurantService } from '@/services/restaurantService';
import { Restaurant } from '@/types';

export default function TestOSMPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testOSMService = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use Amsterdam coordinates directly (same as fallback location)
      const location = {
        latitude: 52.361133,
        longitude: 4.918611
      };

      console.log('Testing OSM service with location:', location);
      
      const results = await restaurantService.getRestaurantsWithFallback(
        location,
        1000, // 1km radius
        10    // limit to 10 restaurants
      );

      console.log('OSM service results:', results);
      setRestaurants(results);
      
    } catch (err) {
      console.error('Error testing OSM service:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">OSM Service Test</h1>
      
      <div className="mb-6">
        <button
          onClick={testOSMService}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Testing OSM Service...' : 'Test OSM Service'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {restaurants.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Found {restaurants.length} restaurants:
          </h2>
          
          <div className="grid gap-4">
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className="card">
                <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                <p className="text-gray-600">{restaurant.address}</p>
                <div className="flex gap-4 text-sm text-gray-500 mt-2">
                  <span>Cuisine: {restaurant.cuisineType}</span>
                  <span>Price: {restaurant.priceRange}</span>
                  <span>Rating: {restaurant.rating}/5</span>
                  <span>Distance: {restaurant.distanceFromUser}km</span>
                </div>
                {restaurant.phoneNumber !== 'Phone not available' && (
                  <p className="text-sm text-gray-500">Phone: {restaurant.phoneNumber}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && restaurants.length === 0 && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-600">Click the button above to test the OSM service.</p>
        </div>
      )}
    </div>
  );
}