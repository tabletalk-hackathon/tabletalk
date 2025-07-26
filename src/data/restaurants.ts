import { Restaurant } from '@/types';

export const mockRestaurants: Restaurant[] = [
  {
    id: 'rest-001',
    name: 'Café de Reiger',
    address: 'Nieuwe Leliestraat 34, 1015 SZ Amsterdam',
    cuisineType: 'Dutch',
    priceRange: '€€',
    rating: 4.5,
    dietaryOptions: ['vegetarian', 'gluten-free'],
    ambianceType: 'casual',
    phoneNumber: '+31 20 624 7426',
    distanceFromUser: 0.8,
    coordinates: { lat: 52.3676, lng: 4.8852 }
  },
  {
    id: 'rest-002',
    name: 'Restaurant Greetje',
    address: 'Peperstraat 23-25, 1011 TJ Amsterdam',
    cuisineType: 'Modern Dutch',
    priceRange: '€€€',
    rating: 4.8,
    dietaryOptions: ['vegetarian', 'vegan'],
    ambianceType: 'fine dining',
    phoneNumber: '+31 20 779 7450',
    distanceFromUser: 1.2,
    coordinates: { lat: 52.3702, lng: 4.8952 }
  },
  {
    id: 'rest-003',
    name: 'Toscanini',
    address: 'Lindengracht 75, 1015 KD Amsterdam',
    cuisineType: 'Italian',
    priceRange: '€€€',
    rating: 4.6,
    dietaryOptions: ['vegetarian'],
    ambianceType: 'romantic',
    phoneNumber: '+31 20 623 2813',
    distanceFromUser: 0.6,
    coordinates: { lat: 52.3745, lng: 4.8845 }
  },
  {
    id: 'rest-004',
    name: 'Restaurant Blauw',
    address: 'Amstelveenseweg 158-160, 1075 XN Amsterdam',
    cuisineType: 'Indonesian',
    priceRange: '€€',
    rating: 4.4,
    dietaryOptions: ['vegetarian', 'vegan', 'gluten-free'],
    ambianceType: 'family-friendly',
    phoneNumber: '+31 20 675 5000',
    distanceFromUser: 2.1,
    coordinates: { lat: 52.3505, lng: 4.8776 }
  },
  {
    id: 'rest-005',
    name: 'Ciel Bleu Restaurant',
    address: 'Ferdinand Bolstraat 333, 1072 LH Amsterdam',
    cuisineType: 'French',
    priceRange: '€€€',
    rating: 4.9,
    dietaryOptions: ['vegetarian'],
    ambianceType: 'fine dining',
    phoneNumber: '+31 20 678 7450',
    distanceFromUser: 1.8,
    coordinates: { lat: 52.3505, lng: 4.8951 }
  },
  {
    id: 'rest-006',
    name: 'Yamazato',
    address: 'Ferdinand Bolstraat 333, 1072 LH Amsterdam',
    cuisineType: 'Japanese',
    priceRange: '€€€',
    rating: 4.7,
    dietaryOptions: ['vegetarian', 'gluten-free'],
    ambianceType: 'fine dining',
    phoneNumber: '+31 20 678 8351',
    distanceFromUser: 1.8,
    coordinates: { lat: 52.3505, lng: 4.8951 }
  },
  {
    id: 'rest-007',
    name: 'De Kas',
    address: 'Kamerlingh Onneslaan 3, 1097 DE Amsterdam',
    cuisineType: 'Mediterranean',
    priceRange: '€€€',
    rating: 4.5,
    dietaryOptions: ['vegetarian', 'vegan'],
    ambianceType: 'romantic',
    phoneNumber: '+31 20 462 4562',
    distanceFromUser: 3.2,
    coordinates: { lat: 52.3676, lng: 4.9407 }
  },
  {
    id: 'rest-008',
    name: 'Café Loetje',
    address: 'Johannes Vermeerstraat 52, 1071 DR Amsterdam',
    cuisineType: 'Dutch',
    priceRange: '€€',
    rating: 4.3,
    dietaryOptions: ['gluten-free'],
    ambianceType: 'casual',
    phoneNumber: '+31 20 662 8173',
    distanceFromUser: 1.5,
    coordinates: { lat: 52.3579, lng: 4.8814 }
  },
  {
    id: 'rest-009',
    name: 'Restaurant Vermeer',
    address: 'Prins Hendrikkade 59-72, 1012 AD Amsterdam',
    cuisineType: 'French',
    priceRange: '€€€',
    rating: 4.8,
    dietaryOptions: ['vegetarian'],
    ambianceType: 'fine dining',
    phoneNumber: '+31 20 556 4885',
    distanceFromUser: 1.1,
    coordinates: { lat: 52.3759, lng: 4.8975 }
  }
];

// Amsterdam Rewire coordinates as fallback
export const FALLBACK_LOCATION = {
  latitude: 52.361133,
  longitude: 4.918611
};