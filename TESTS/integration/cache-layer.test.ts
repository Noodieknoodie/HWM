// TESTS/integration/cache-layer.test.ts
/**
 * Tests for the API caching layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiCache, cacheKeys } from '../../src/utils/cache';

describe('API Cache Layer', () => {
  beforeEach(() => {
    apiCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { id: 1, name: 'Test Client' };
      const key = 'test_key';

      // Initially empty
      expect(apiCache.get(key)).toBeNull();

      // Set data
      apiCache.set(key, testData);

      // Retrieve data
      const retrieved = apiCache.get(key);
      expect(retrieved).toEqual(testData);
    });

    it('should respect TTL expiration', () => {
      const testData = { notes: 'Q1 summary' };
      const key = 'test_ttl';
      const ttl = 5 * 60 * 1000; // 5 minutes

      apiCache.set(key, testData, ttl);

      // Should exist initially
      expect(apiCache.get(key)).toEqual(testData);

      // Advance time by 4 minutes - should still exist
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(apiCache.get(key)).toEqual(testData);

      // Advance time by 2 more minutes (total 6 minutes) - should expire
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(apiCache.get(key)).toBeNull();
    });

    it('should clear specific keys', () => {
      apiCache.set('key1', { data: 1 });
      apiCache.set('key2', { data: 2 });

      // Both should exist
      expect(apiCache.get('key1')).toBeTruthy();
      expect(apiCache.get('key2')).toBeTruthy();

      // Clear key1
      apiCache.clear('key1');

      // key1 gone, key2 remains
      expect(apiCache.get('key1')).toBeNull();
      expect(apiCache.get('key2')).toBeTruthy();
    });

    it('should clear all keys', () => {
      apiCache.set('key1', { data: 1 });
      apiCache.set('key2', { data: 2 });
      apiCache.set('key3', { data: 3 });

      // Clear all
      apiCache.clear();

      // All gone
      expect(apiCache.get('key1')).toBeNull();
      expect(apiCache.get('key2')).toBeNull();
      expect(apiCache.get('key3')).toBeNull();
    });

    it('should invalidate by pattern', () => {
      apiCache.set('quarterly_notes_2025_1', { notes: 'Q1' });
      apiCache.set('quarterly_notes_2025_2', { notes: 'Q2' });
      apiCache.set('quarterly_summary_1_2025_1', { summary: 'Client 1 Q1' });
      apiCache.set('contacts_1', { contacts: [] });

      // Invalidate all quarterly_notes
      apiCache.invalidatePattern('quarterly_notes');

      // quarterly_notes gone, others remain
      expect(apiCache.get('quarterly_notes_2025_1')).toBeNull();
      expect(apiCache.get('quarterly_notes_2025_2')).toBeNull();
      expect(apiCache.get('quarterly_summary_1_2025_1')).toBeTruthy();
      expect(apiCache.get('contacts_1')).toBeTruthy();
    });
  });

  describe('Cache Key Builders', () => {
    it('should generate consistent keys', () => {
      expect(cacheKeys.quarterlyNotes(2025, 1)).toBe('quarterly_notes_2025_1');
      expect(cacheKeys.quarterlyNotes(2025, 2)).toBe('quarterly_notes_2025_2');
      
      expect(cacheKeys.quarterlySummary(1, 2025, 1)).toBe('quarterly_summary_1_2025_1');
      
      expect(cacheKeys.contacts(1)).toBe('contacts_1');
      expect(cacheKeys.contacts(50)).toBe('contacts_50');
      
      expect(cacheKeys.dashboard('monthly')).toBe('dashboard_monthly');
      expect(cacheKeys.dashboard('quarterly')).toBe('dashboard_quarterly');
    });
  });

  describe('Cache Stats', () => {
    it('should provide cache statistics', () => {
      apiCache.set('key1', { data: 1 }, 5000);
      apiCache.set('key2', { data: 2 }, 10000);
      
      const stats = apiCache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      
      const entry1 = stats.entries.find(e => e.key === 'key1');
      expect(entry1?.ttl).toBe(5000);
      expect(entry1?.expired).toBe(false);
      
      // Advance time
      vi.advanceTimersByTime(6000);
      
      const newStats = apiCache.getStats();
      const expiredEntry = newStats.entries.find(e => e.key === 'key1');
      expect(expiredEntry?.expired).toBe(true);
    });
  });

  describe('Real Use Case: Quarterly Notes', () => {
    it('simulates caching quarterly notes', async () => {
      // Mock API response
      const mockApiResponse = [
        { client_id: 1, notes: 'Client 1 Q2 notes' },
        { client_id: 2, notes: 'Client 2 Q2 notes' },
        // ... 50 clients total
      ];

      // First call - cache miss
      let apiCallCount = 0;
      const fetchData = async () => {
        apiCallCount++;
        return mockApiResponse;
      };

      // Simulate API client with caching
      const getQuarterlyNotesBatch = async (year: number, quarter: number) => {
        const cacheKey = cacheKeys.quarterlyNotes(year, quarter);
        
        const cached = apiCache.get(cacheKey);
        if (cached) {
          return cached;
        }
        
        const data = await fetchData();
        apiCache.set(cacheKey, data, 5 * 60 * 1000);
        return data;
      };

      // First call - hits API
      const result1 = await getQuarterlyNotesBatch(2025, 2);
      expect(apiCallCount).toBe(1);
      expect(result1).toEqual(mockApiResponse);

      // Second call - hits cache
      const result2 = await getQuarterlyNotesBatch(2025, 2);
      expect(apiCallCount).toBe(1); // No additional API call
      expect(result2).toEqual(mockApiResponse);

      // Third call after 3 minutes - still hits cache
      vi.advanceTimersByTime(3 * 60 * 1000);
      const result3 = await getQuarterlyNotesBatch(2025, 2);
      expect(apiCallCount).toBe(1); // Still no API call

      // Fourth call after 6 minutes total - cache expired
      vi.advanceTimersByTime(3 * 60 * 1000);
      const result4 = await getQuarterlyNotesBatch(2025, 2);
      expect(apiCallCount).toBe(2); // New API call
    });

    it('invalidates cache on update', async () => {
      const cacheKey = cacheKeys.quarterlyNotes(2025, 2);
      
      // Set initial cache
      apiCache.set(cacheKey, [{ client_id: 1, notes: 'Old notes' }]);
      
      // Verify it exists
      expect(apiCache.get(cacheKey)).toBeTruthy();
      
      // Simulate note update (which should clear cache)
      apiCache.clear(cacheKey);
      
      // Cache should be cleared
      expect(apiCache.get(cacheKey)).toBeNull();
    });
  });
});