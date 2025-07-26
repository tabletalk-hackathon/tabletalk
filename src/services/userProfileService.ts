import { UserProfile } from '@/types';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'tabletalk_user_profile';

export class UserProfileService {
  getProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const profile = JSON.parse(stored);
        logger.search('User profile loaded from localStorage', profile);
        return profile;
      }
    } catch (error) {
      logger.error('Failed to load user profile from localStorage', error);
    }
    
    return null;
  }

  saveProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      logger.search('User profile saved to localStorage', profile);
    } catch (error) {
      logger.error('Failed to save user profile to localStorage', error);
    }
  }

  getDefaultProfile(): UserProfile {
    return {
      name: 'Demo',
      surname: 'User',
      cuisinePreferences: ['Italian', 'Dutch', 'French'],
      priceRangePreference: '€€',
      dietaryRestrictions: ['vegetarian'],
      ambiancePreference: 'casual'
    };
  }

  hasProfile(): boolean {
    return this.getProfile() !== null;
  }

  clearProfile(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
      logger.search('User profile cleared from localStorage');
    } catch (error) {
      logger.error('Failed to clear user profile from localStorage', error);
    }
  }
}

export const userProfileService = new UserProfileService();