export interface Restaurant {
  id: string;
  name: string;
  address: string;
  cuisineType: string;
  priceRange: '€' | '€€' | '€€€';
  rating: number;
  dietaryOptions: string[];
  ambianceType: string;
  phoneNumber: string;
  distanceFromUser: number; // in km
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface UserProfile {
  name: string;
  surname: string;
  cuisinePreferences: string[];
  priceRangePreference: '€' | '€€' | '€€€';
  dietaryRestrictions: string[];
  ambiancePreference: string;
}

export interface BookingDetails {
  restaurantId: string;
  restaurant: Restaurant;
  bookingTime: string;
  numberOfPeople: number;
  bookingReference: string;
  confirmationDetails: string;
}

export interface LLMRankingResponse {
  rankedRestaurants: Restaurant[];
  reasoning: string;
  timestamp: string;
}

export interface CallLog {
  restaurantName: string;
  phoneNumber: string;
  status: 'dialing' | 'connected' | 'requesting' | 'confirmed' | 'declined';
  conversation: string[];
  timestamp: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LogEntry {
  timestamp: string;
  type: 'gps' | 'search' | 'llm' | 'call' | 'booking' | 'error';
  message: string;
  data?: any;
}