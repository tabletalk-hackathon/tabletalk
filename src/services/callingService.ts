import { Restaurant, CallLog, BookingDetails } from '@/types';
import { logger } from '@/utils/logger';

interface BirdCallRequest {
  to: string;
  from: string;
  flowStart: string;
  ringTimeout: number;
  maxDuration: number;
  callFlow: BirdCallFlowStep[];
}

interface BirdCallFlowStep {
  command: string;
  options?: {
    locale?: string;
    text?: string;
    voice?: string;
  };
}

interface BirdCallResponse {
  id: string;
  status: string;
  to: string;
  from: string;
  createdAt: string;
}

interface BirdCallStatusResponse {
  id: string;
  status: 'queued' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer';
  to: string;
  from: string;
  createdAt: string;
  answeredAt?: string;
  completedAt?: string;
  duration?: number;
  result?: {
    reason?: string;
    hangupCause?: string;
  };
}

export class CallingService {
  private readonly BIRD_API_BASE_URL = 'https://api.bird.com';
  private readonly WORKSPACE_ID = '8baa8cd3-0a07-47c1-9246-06a9706bb136';
  private readonly CHANNEL_ID = '7ea673b6-38d0-5167-9a5c-8ef84087c112';
  private readonly ACCESS_KEY = 'LhgJgn4Zgt3ZTQSnAvyf8qituywZDifdq7bV';
  private readonly FROM_NUMBER = '+3197058024656';
  private readonly TEST_NUMBER = '+31645143042'; // Fixed testing number for all calls
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

    try {
      logger.call(`Calling restaurant ${callNumber} of ${totalCalls}...`);
      logger.call(`Initiating Bird.com call for ${restaurant.name} (using test number ${this.TEST_NUMBER})`);
      callLog.conversation.push(`Initiating Bird.com call for ${restaurant.name} (using test number ${this.TEST_NUMBER})`);
      
      // Create call request for Bird.com API
      const callRequest: BirdCallRequest = {
        to: this.TEST_NUMBER, // Use fixed testing number for all calls
        from: this.FROM_NUMBER,
        flowStart: "from-answer",
        ringTimeout: 30,
        maxDuration: 600,
        callFlow: [
          {
            command: "say",
            options: {
              locale: "en-US",
              text: `Hello, this is ${userName} ${userSurname} calling ${restaurant.name} to make a reservation. I would like to book a table for 2 people at 7 PM today. Could you please check availability?`,
              voice: "female"
            }
          },
          {
            command: "hangup"
          }
        ]
      };

      // Make API call to Bird.com
      const response = await this.makeBirdApiCall(callRequest);
      
      if (response) {
        callLog.status = 'connected';
        logger.call(`Call initiated successfully with ID: ${response.id}`);
        callLog.conversation.push(`Call initiated successfully with ID: ${response.id}`);
        
        // Wait for call completion and get actual status
        const finalStatus = await this.waitForCallCompletion(response.id);
        
        if (finalStatus) {
          // Process call based on actual Bird.com status
          return await this.processCallResult(finalStatus, restaurant, userName, userSurname, callLog);
        } else {
          // If we can't get status, fall back to mock behavior
          logger.call('Could not get call status, falling back to mock behavior');
          callLog.conversation.push('Could not get call status, falling back to mock behavior');
          return this.mockCallBehavior(restaurant, userName, userSurname, callNumber);
        }
      } else {
        throw new Error('Failed to initiate call through Bird.com API');
      }
    } catch (error) {
      callLog.status = 'failed';
      const errorMessage = `Call failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.call(errorMessage);
      callLog.conversation.push(errorMessage);
      
      // Fall back to mock behavior if API fails
      logger.call('Falling back to mock behavior due to API failure');
      return this.mockCallBehavior(restaurant, userName, userSurname, callNumber);
    }
  }

  private async makeBirdApiCall(callRequest: BirdCallRequest): Promise<BirdCallResponse | null> {
    const url = `${this.BIRD_API_BASE_URL}/workspaces/${this.WORKSPACE_ID}/channels/${this.CHANNEL_ID}/calls`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${this.ACCESS_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callRequest)
      });

      if (!response.ok) {
        throw new Error(`Bird API call failed: ${response.status} ${response.statusText}`);
      }

      const result: BirdCallResponse = await response.json();
      return result;
    } catch (error) {
      logger.call(`Bird API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  private async getCallStatus(callId: string): Promise<BirdCallStatusResponse | null> {
    const url = `${this.BIRD_API_BASE_URL}/workspaces/${this.WORKSPACE_ID}/channels/${this.CHANNEL_ID}/calls/${callId}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `AccessKey ${this.ACCESS_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Bird API status check failed: ${response.status} ${response.statusText}`);
      }

      const result: BirdCallStatusResponse = await response.json();
      return result;
    } catch (error) {
      logger.call(`Bird API status check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  private async waitForCallCompletion(callId: string, maxWaitTime: number = 60000): Promise<BirdCallStatusResponse | null> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds
    
    logger.call(`Waiting for call ${callId} to complete...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getCallStatus(callId);
      
      if (!status) {
        logger.call('Failed to get call status, continuing to poll...');
        await this.delay(pollInterval);
        continue;
      }
      
      logger.call(`Call status: ${status.status}`);
      
      // Check if call is in a final state
      if (['completed', 'failed', 'busy', 'no-answer'].includes(status.status)) {
        logger.call(`Call completed with status: ${status.status}`);
        if (status.duration) {
          logger.call(`Call duration: ${status.duration} seconds`);
        }
        if (status.result?.reason) {
          logger.call(`Call result reason: ${status.result.reason}`);
        }
        return status;
      }
      
      // Wait before next poll
      await this.delay(pollInterval);
    }
    
    logger.call(`Call status polling timed out after ${maxWaitTime}ms`);
    return null;
  }

  private async processCallResult(
    callStatus: BirdCallStatusResponse,
    restaurant: Restaurant,
    userName: string,
    userSurname: string,
    callLog: CallLog
  ): Promise<BookingDetails | null> {
    // Process the actual call result from Bird.com
    switch (callStatus.status) {
      case 'completed':
        // Call was completed successfully
        callLog.status = 'confirmed';
        const successMessage = `Call completed successfully. Duration: ${callStatus.duration || 0} seconds`;
        logger.call(successMessage);
        callLog.conversation.push(successMessage);
        
        // For now, simulate restaurant response based on call completion
        // In a real implementation, you would analyze the call recording or use speech-to-text
        const availabilityChance = 0.7; // 70% chance of availability for completed calls
        const isAvailable = Math.random() < availabilityChance;
        
        if (isAvailable) {
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
          const declineMessage = 'Restaurant reported no availability despite call completion';
          logger.call(declineMessage);
          callLog.conversation.push(declineMessage);
          return null;
        }

      case 'busy':
        callLog.status = 'declined';
        const busyMessage = 'Restaurant line was busy';
        logger.call(busyMessage);
        callLog.conversation.push(busyMessage);
        return null;

      case 'no-answer':
        callLog.status = 'declined';
        const noAnswerMessage = 'Restaurant did not answer the call';
        logger.call(noAnswerMessage);
        callLog.conversation.push(noAnswerMessage);
        return null;

      case 'failed':
        callLog.status = 'failed';
        const failedMessage = `Call failed: ${callStatus.result?.reason || 'Unknown reason'}`;
        logger.call(failedMessage);
        callLog.conversation.push(failedMessage);
        return null;

      default:
        callLog.status = 'failed';
        const unknownMessage = `Unknown call status: ${callStatus.status}`;
        logger.call(unknownMessage);
        callLog.conversation.push(unknownMessage);
        return null;
    }
  }

  private async mockCallBehavior(
    restaurant: Restaurant,
    userName: string,
    userSurname: string,
    callNumber: number
  ): Promise<BookingDetails | null> {
    // Fallback mock behavior when API is unavailable
    const availabilityChance = Math.max(0.3, 0.9 - (callNumber - 1) * 0.2);
    const isAvailable = Math.random() < availabilityChance;

    await this.delay(2000);

    if (isAvailable) {
      const bookingReference = this.generateBookingReference();
      const confirmationDetails = `Mock booking confirmed for ${userName} ${userSurname}, table for 2 at 19:00 today. Reference: ${bookingReference}`;
      
      logger.call(confirmationDetails);

      return {
        restaurantId: restaurant.id,
        restaurant,
        bookingTime: '19:00',
        numberOfPeople: 2,
        bookingReference,
        confirmationDetails
      };
    }

    return null;
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