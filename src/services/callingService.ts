import { Restaurant, CallLog, BookingDetails } from '@/types';
import { logger } from '@/utils/logger';

export class CallingService {
  async callRestaurants(restaurants: Restaurant[], userName: string, userSurname: string): Promise<BookingDetails | null> {
    logger.call('Starting restaurant calling process', {
      restaurants: restaurants.map(r => r.name),
      representative: `${userName} ${userSurname}`
    });

    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];
      const callResult = await this.callRestaurant(restaurant, userName, userSurname, i + 1, restaurants.length);
      
      if (callResult) {
        logger.call('Booking confirmed - stopping further calls', {
          restaurant: restaurant.name,
          bookingReference: callResult.bookingReference
        });
        return callResult;
      }
    }

    logger.call('All restaurants called - no availability found');
    return null;
  }

  private async callRestaurant(
    restaurant: Restaurant, 
    userName: string, 
    userSurname: string,
    callNumber: number,
    totalCalls: number
  ): Promise<BookingDetails | null> {
    const callLog: CallLog = {
      restaurantName: restaurant.name,
      phoneNumber: restaurant.phoneNumber,
      status: 'dialing',
      conversation: [],
      timestamp: new Date().toISOString()
    };

    // Simulate dialing
    logger.call(`Calling restaurant ${callNumber} of ${totalCalls}...`);
    logger.call(`Dialing ${restaurant.name} at ${restaurant.phoneNumber}`);
    callLog.conversation.push(`Dialing ${restaurant.name} at ${restaurant.phoneNumber}`);
    
    await this.delay(2000);

    // Simulate connection
    callLog.status = 'connected';
    logger.call('Connected - stating request');
    callLog.conversation.push('Connected - stating request');
    
    await this.delay(1000);

    // Simulate request
    callLog.status = 'requesting';
    const requestMessage = 'Requesting table for 2 people at 19:00 today';
    logger.call(requestMessage);
    callLog.conversation.push(requestMessage);
    
    const representativeMessage = `Representative: ${userName} ${userSurname}`;
    logger.call(representativeMessage);
    callLog.conversation.push(representativeMessage);
    
    await this.delay(1500);

    // Mock restaurant response (70% chance of availability for first restaurant, decreasing for others)
    const availabilityChance = Math.max(0.3, 0.9 - (callNumber - 1) * 0.2);
    const isAvailable = Math.random() < availabilityChance;

    if (isAvailable) {
      callLog.status = 'confirmed';
      const confirmationMessage = 'Restaurant: "Yes, we have availability for 2 people at 19:00 today"';
      logger.call(confirmationMessage);
      callLog.conversation.push(confirmationMessage);
      
      const bookingReference = this.generateBookingReference();
      const confirmationDetails = `Booking confirmed for ${userName} ${userSurname}, table for 2 at 19:00 today. Reference: ${bookingReference}`;
      
      logger.call(confirmationDetails);
      callLog.conversation.push(confirmationDetails);

      return {
        restaurantId: restaurant.id,
        restaurant,
        bookingTime: '19:00',
        numberOfPeople: 2,
        bookingReference,
        confirmationDetails
      };
    } else {
      callLog.status = 'declined';
      const declineMessage = 'Restaurant: "Sorry, we are fully booked for tonight"';
      logger.call(declineMessage);
      callLog.conversation.push(declineMessage);
      
      logger.call('Moving to next restaurant...');
      return null;
    }
  }

  private generateBookingReference(): string {
    const prefix = 'TT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const callingService = new CallingService();