import { BookingDetails } from '@/types';
import { logger } from '@/utils/logger';

export class IntegrationService {
  createGoogleCalendarEvent(booking: BookingDetails): void {
    const today = new Date();
    const eventDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0); // 7 PM today
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const eventDetails = {
      text: `Dinner at ${booking.restaurant.name}`,
      dates: `${this.formatDateForCalendar(eventDate)}/${this.formatDateForCalendar(endDate)}`,
      location: booking.restaurant.address,
      details: `Booking Reference: ${booking.bookingReference}\nPhone: ${booking.restaurant.phoneNumber}\nCuisine: ${booking.restaurant.cuisineType}\nRating: ${booking.restaurant.rating}/5`
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.text)}&dates=${eventDetails.dates}&location=${encodeURIComponent(eventDetails.location)}&details=${encodeURIComponent(eventDetails.details)}`;

    logger.booking('Opening Google Calendar with event details', eventDetails);
    
    if (typeof window !== 'undefined') {
      window.open(calendarUrl, '_blank');
    }
  }

  openGoogleMaps(booking: BookingDetails): void {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.restaurant.address)}`;
    
    logger.booking('Opening Google Maps with restaurant location', {
      restaurant: booking.restaurant.name,
      address: booking.restaurant.address
    });
    
    if (typeof window !== 'undefined') {
      window.open(mapsUrl, '_blank');
    }
  }

  calculateTravelTime(userLat: number, userLng: number, restaurantLat: number, restaurantLng: number): string {
    // Simple estimation: assume 30 km/h average speed in city
    const distance = this.calculateDistance(userLat, userLng, restaurantLat, restaurantLng);
    const timeInHours = distance / 30;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    if (timeInMinutes < 60) {
      return `${timeInMinutes} minutes`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const minutes = timeInMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private formatDateForCalendar(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}

export const integrationService = new IntegrationService();