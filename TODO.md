# TableTalk - Restaurant Reservation App - TODO List

## 📱 Screen 1: Landing Page
- [ ] Create simple UI with single "BOOK" button
- [ ] Implement GPS location request on button click
- [ ] Add loading spinner during location detection
- [ ] Store GPS coordinates in browser session
- [ ] Trigger restaurant search process in background
- [ ] Navigate to Screen 2 when processing complete

## 🔍 Background Process 1: Restaurant Discovery & Ranking
- [ ] Mock GPS location service (fallback to Amsterdam Rewire coordinates - 52°21'40.8"N 4°55'05.1"E)
- [ ] Create mock restaurant database with properties:
  - Name, address, cuisine type, price range (€/€€/€€€)
  - Rating, dietary options, ambiance type
  - Phone number, distance from user
- [ ] Implement LLM integration for restaurant ranking
- [ ] LLM input data: user preferences + restaurant data + distance + ratings
- [ ] Log LLM reasoning process to console
- [ ] Return top 6 restaurants (3 for display + 3 for "OTHER" option)

## 👤 User Profile System (Local Storage)
- [ ] Create user preference schema:
  - Name and surname
  - Cuisine preferences (Italian, Asian, Dutch, etc.)
  - Price range preference (€/€€/€€€)
  - Dietary restrictions (vegetarian, vegan, gluten-free, etc.)
  - Ambiance preference (casual, fine dining, romantic, family-friendly)
- [ ] Implement profile creation/editing interface
- [ ] Store preferences in localStorage
- [ ] Load preferences on app initialization

## 📱 Screen 2: Restaurant Selection
- [ ] Display top 3 restaurants with checkboxes
- [ ] Show restaurant details: name, cuisine, price level, rating, distance
- [ ] Add "OK" button (enabled when restaurant selected)
- [ ] Add "OTHER" button to show next 3 restaurants
- [ ] Implement restaurant selection logic
- [ ] Trigger calling process on "OK" click
- [ ] Navigate to Screen 3 when booking confirmed

## 📞 Background Process 2: Restaurant Calling (Mocked)
- [ ] Create mock calling service interface
- [ ] Implement calling sequence with detailed logging:
  - "Dialing [restaurant name] at [phone number]"
  - "Connected - stating request"
  - "Requesting table for 2 people at 19:00 today"
  - "Representative: [user name surname]"
  - Mock restaurant responses (available/not available)
- [ ] Add realistic delays between calls (2-3 seconds each)
- [ ] Show progress indicator: "Calling restaurant 1 of 3..."
- [ ] Generate mock booking confirmation details
- [ ] Handle scenario where first restaurant confirms (stop calling others)
- [ ] Log all conversation details to console

## 📱 Screen 3: Booking Confirmation
- [ ] Display confirmed restaurant details:
  - Restaurant name and address
  - Booking time (19:00 today)
  - Number of people (2)
  - Booking reference number
  - Phone number for changes/cancellation
- [ ] Show LLM reasoning for restaurant selection
- [ ] Add "Add to Google Calendar" button with event creation
- [ ] Add "Open in Google Maps" button with restaurant location
- [ ] Include restaurant rating and cuisine type
- [ ] Display estimated travel time from current location

## 📅 Calendar Integration
- [ ] Create Google Calendar event with:
  - Title: "Dinner at [Restaurant Name]"
  - Time: Today at 19:00 (2 hour duration)
  - Location: Restaurant address
  - Description: Booking reference and phone number

## 🧠 LLM Integration
- [ ] Set up LLM API connection (OpenAI/Claude/local model)
- [ ] Create restaurant ranking prompt template
- [ ] Include user preferences, restaurant data, and ranking criteria
- [ ] Parse LLM response for restaurant order and reasoning
- [ ] Log LLM input/output for demo transparency

## 📊 Demo Data & Logging
- [ ] Implement comprehensive console logging:
  - GPS coordinates detection
  - Restaurant search parameters
  - LLM ranking process and reasoning
  - Mock calling conversations
  - Booking confirmation details
- [ ] Add timestamps to all log entries
- [ ] Color-code different log types for easy demo reading