import { LocationData } from '@/types';
import { FALLBACK_LOCATION } from '@/data/restaurants';
import { logger } from '@/utils/logger';

export class LocationService {
  async getCurrentLocation(): Promise<LocationData> {
    logger.gps('Requesting GPS location from browser');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        logger.error('Geolocation is not supported by this browser');
        logger.gps('Using fallback location: Amsterdam Rewire coordinates');
        resolve(FALLBACK_LOCATION);
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          logger.gps('GPS location obtained successfully', {
            coordinates: `${location.latitude}, ${location.longitude}`,
            accuracy: `${location.accuracy}m`
          });
          
          resolve(location);
        },
        (error) => {
          logger.error('GPS location request failed', {
            code: error.code,
            message: error.message
          });
          
          logger.gps('Using fallback location: Amsterdam Rewire coordinates', FALLBACK_LOCATION);
          resolve(FALLBACK_LOCATION);
        },
        options
      );
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const locationService = new LocationService();