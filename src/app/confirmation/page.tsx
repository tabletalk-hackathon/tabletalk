'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookingDetails, LocationData, LLMRankingResponse } from '@/types';
import { integrationService } from '@/services/integrationService';
import { logger } from '@/utils/logger';

export default function BookingConfirmationPage() {
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [llmReasoning, setLlmReasoning] = useState<string>('');
  const [travelTime, setTravelTime] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Load data from session storage
    if (typeof window !== 'undefined') {
      const bookingData = sessionStorage.getItem('bookingDetails');
      const locationData = sessionStorage.getItem('userLocation');
      const rankingData = sessionStorage.getItem('restaurantRanking');
      
      if (bookingData) {
        const booking: BookingDetails = JSON.parse(bookingData);
        setBookingDetails(booking);
        logger.booking('Booking confirmation page loaded', booking);
      }
      
      if (locationData) {
        const location: LocationData = JSON.parse(locationData);
        setUserLocation(location);
      }
      
      if (rankingData) {
        const ranking: LLMRankingResponse = JSON.parse(rankingData);
        setLlmReasoning(ranking.reasoning);
      }
      
      // If no booking data, redirect back to home
      if (!bookingData) {
        router.push('/');
        return;
      }
      
      // Calculate travel time if we have both booking and location data
      if (bookingData && locationData) {
        const booking: BookingDetails = JSON.parse(bookingData);
        const location: LocationData = JSON.parse(locationData);
        
        const estimatedTime = integrationService.calculateTravelTime(
          location.latitude,
          location.longitude,
          booking.restaurant.coordinates.lat,
          booking.restaurant.coordinates.lng
        );
        setTravelTime(estimatedTime);
      }
    }
  }, [router]);

  const handleAddToCalendar = () => {
    if (bookingDetails) {
      integrationService.createGoogleCalendarEvent(bookingDetails);
    }
  };

  const handleOpenMaps = () => {
    if (bookingDetails) {
      integrationService.openGoogleMaps(bookingDetails);
    }
  };

  const handleBookAnother = () => {
    // Clear session data and start over
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    router.push('/');
  };

  if (!bookingDetails) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="spinner"></div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">
          Booking Confirmed!
        </h1>
        <p className="text-gray-600">
          Your table has been successfully reserved
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Reservation Details
        </h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="font-medium text-gray-700">Restaurant:</span>
            <span className="text-right font-semibold">{bookingDetails.restaurant.name}</span>
          </div>
          
          <div className="flex justify-between items-start">
            <span className="font-medium text-gray-700">Address:</span>
            <span className="text-right text-sm">{bookingDetails.restaurant.address}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Date & Time:</span>
            <span className="font-semibold">{today} at {bookingDetails.bookingTime}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Party Size:</span>
            <span className="font-semibold">{bookingDetails.numberOfPeople} people</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Booking Reference:</span>
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {bookingDetails.bookingReference}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Phone:</span>
            <span className="text-blue-600">{bookingDetails.restaurant.phoneNumber}</span>
          </div>
          
          {travelTime && (
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Travel Time:</span>
              <span className="text-green-600 font-medium">~{travelTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Info Card */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          About {bookingDetails.restaurant.name}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Cuisine:</span>
            <p>{bookingDetails.restaurant.cuisineType}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Price Range:</span>
            <p className="text-green-600 font-medium">{bookingDetails.restaurant.priceRange}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Rating:</span>
            <p>
              <span className="text-yellow-600">{'★'.repeat(Math.floor(bookingDetails.restaurant.rating))}</span>
              <span className="ml-1">{bookingDetails.restaurant.rating}/5</span>
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Distance:</span>
            <p>{bookingDetails.restaurant.distanceFromUser}km away</p>
          </div>
        </div>
      </div>

      {/* AI Reasoning Card */}
      {llmReasoning && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            🤖 Why We Chose This Restaurant
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            {llmReasoning}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleAddToCalendar}
          className="btn-primary w-full flex items-center justify-center"
        >
          <span className="mr-2">📅</span>
          Add to Google Calendar
        </button>
        
        <button
          onClick={handleOpenMaps}
          className="btn-secondary w-full flex items-center justify-center"
        >
          <span className="mr-2">🗺️</span>
          Open in Google Maps
        </button>
      </div>

      {/* Important Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Important Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Please arrive on time for your reservation</li>
          <li>• Call {bookingDetails.restaurant.phoneNumber} for any changes or cancellations</li>
          <li>• Keep your booking reference: {bookingDetails.bookingReference}</li>
          <li>• Consider dietary restrictions when ordering</li>
        </ul>
      </div>

      {/* Book Another Button */}
      <div className="text-center">
        <button
          onClick={handleBookAnother}
          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
        >
          Book Another Restaurant →
        </button>
      </div>
    </div>
  );
}