'use client';

import { useState } from 'react';
import { callingService } from '@/services/callingService';
import { Restaurant } from '@/types';

const mockRestaurants: Restaurant[] = [
  {
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
  }
];

export default function TestCallingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const testCalling = async () => {
    setIsLoading(true);
    setResult(null);
    setLogs([]);

    // Capture console logs
    const originalLog = console.log;
    console.log = (...args) => {
      setLogs(prev => [...prev, args.join(' ')]);
      originalLog(...args);
    };

    try {
      const bookingResult = await callingService.callRestaurants(
        mockRestaurants,
        'John',
        'Doe'
      );
      setResult(bookingResult);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      console.log = originalLog;
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Bird.com Calling Service Test</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>Workspace ID:</strong> 8baa8cd3-0a07-47c1-9246-06a9706bb136</p>
          <p><strong>Channel ID:</strong> 7ea673b6-38d0-5167-9a5c-8ef84087c112</p>
          <p><strong>From Number:</strong> +3197058024656</p>
          <p><strong>Test Number (To):</strong> +31645143042</p>
          <p><strong>Test Restaurant:</strong> {mockRestaurants[0].name}</p>
        </div>
      </div>

      <button
        onClick={testCalling}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isLoading ? 'Making Call...' : 'Test Bird.com API Call'}
      </button>

      {logs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Call Logs</h3>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Result</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">How it works</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <ul className="list-disc list-inside space-y-2">
            <li>The service now integrates with Bird.com API for real phone calls</li>
            <li>All calls use the fixed testing number +31645143042 for safety</li>
            <li>It creates a call flow with a personalized message mentioning the specific restaurant</li>
            <li>The service waits for actual call completion status from Bird.com API</li>
            <li>Booking decisions are made based on real call results (completed, busy, no-answer, failed)</li>
            <li>If the API fails, it falls back to mock behavior for testing</li>
            <li>Call logs track the entire process including status polling and final results</li>
          </ul>
        </div>
      </div>
    </div>
  );
}