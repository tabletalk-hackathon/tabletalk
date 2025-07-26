// Quick test of the Bird.com calling service integration
const { CallingService } = require('./src/services/callingService.ts');

const mockRestaurant = {
  id: '1',
  name: 'Test Restaurant',
  address: '123 Test Street, Amsterdam',
  cuisineType: 'Italian',
  priceRange: '€€',
  rating: 4.5,
  dietaryOptions: ['Vegetarian'],
  ambianceType: 'Casual',
  phoneNumber: '+31645143042',
  distanceFromUser: 1.2,
  coordinates: { lat: 52.3676, lng: 4.9041 }
};

async function testCalling() {
  console.log('Testing Bird.com API integration...');
  
  const callingService = new CallingService();
  
  try {
    const result = await callingService.callRestaurants(
      [mockRestaurant],
      'John',
      'Doe'
    );
    
    console.log('Call result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCalling();