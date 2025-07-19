// src/utils/cache.ts
/**
 * Simple in-memory cache with TTL (time-to-live) support
 * Perfect for caching API responses that don't change often
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if valid (not expired)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // console.log(`[Cache HIT] ${key}`);
    return entry.data as T;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // console.log(`[Cache SET] ${key} (TTL: ${ttl || this.DEFAULT_TTL}ms)`);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    });
  }

  /**
   * Clear specific key or entire cache
   */
  clear(key?: string): void {
    if (key) {
      // console.log(`[Cache CLEAR] ${key}`);
      this.cache.delete(key);
    } else {
      // console.log('[Cache CLEAR ALL]');
      this.cache.clear();
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      // console.log(`[Cache INVALIDATE] ${key}`);
      this.cache.delete(key);
    });
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      expired: now - entry.timestamp > entry.ttl,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }
}

// Singleton instance
export const apiCache = new SimpleCache();

// Cache key builders
export const cacheKeys = {
  dashboard: (viewType: string) => `dashboard_${viewType}`,
  quarterlyNotes: (year: number, quarter: number) => `quarterly_notes_${year}_${quarter}`,
  quarterlySummary: (clientId: number, year: number, quarter: number) => 
    `quarterly_summary_${clientId}_${year}_${quarter}`,
  clients: () => 'clients_all',
  contacts: (clientId: number) => `contacts_${clientId}`,
  paymentDetails: (clientId: number, year: number, quarter: number) => 
    `payment_details_${clientId}_${year}_${quarter}`,
};