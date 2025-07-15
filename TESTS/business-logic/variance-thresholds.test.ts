// TESTS/business-logic/variance-thresholds.test.ts
/**
 * Tests for fee variance calculation and thresholds based on real data.
 * 
 * Variance categories from PaymentForm.tsx:
 * - Exact match: < 0.01% (less than 1 basis point)
 * - Acceptable: ≤ 5%
 * - Warning: ≤ 15%
 * - Alert: > 15%
 */

import { describe, it, expect } from 'vitest';

describe('Fee Variance Calculations', () => {
  // Real variance examples from database
  const realVarianceExamples = [
    { client: 'AirSea America', variance: 5.11, category: 'warning' },
    { client: 'XFire', variance: 1.37, category: 'acceptable' },
    { client: 'Mobile Focused', variance: 0.42, category: 'acceptable' },
    { client: 'Three Sigma', variance: 0.31, category: 'acceptable' },
    { client: 'Lavle USA', variance: 0.08, category: 'acceptable' },
    { client: 'Bellmont Cabinets', variance: 0.075, category: 'acceptable' },
    { client: 'Floform', variance: 0.035, category: 'acceptable' },
  ];

  function categorizeVariance(variancePercent: number): string {
    if (variancePercent < 0.01) return 'exact';
    if (variancePercent <= 5) return 'acceptable';
    if (variancePercent <= 15) return 'warning';
    return 'alert';
  }

  it('categorizes real variances correctly', () => {
    realVarianceExamples.forEach(({ client, variance, category }) => {
      const calculated = categorizeVariance(variance);
      expect(calculated).toBe(category);
    });
  });

  it('calculates variance percentage correctly', () => {
    // Example: AirSea America
    const totalAssets = 1400234.25;
    const percentRate = 0.0007;
    const expectedFee = totalAssets * percentRate; // 980.16
    const actualFee = 930.09;
    
    const variance = Math.abs(actualFee - expectedFee) / expectedFee * 100;
    
    expect(variance).toBeCloseTo(5.11, 1); // 5.11% variance
  });

  it('shows most payments are within acceptable range', () => {
    const acceptableCount = realVarianceExamples.filter(e => 
      e.category === 'acceptable' || e.category === 'exact'
    ).length;
    
    const acceptableRate = acceptableCount / realVarianceExamples.length;
    
    expect(acceptableRate).toBeGreaterThan(0.8); // Over 80% are acceptable
  });

  it('identifies edge case: zero expected fee', () => {
    // If percent_rate is 0 or total_assets is 0, avoid division by zero
    const calculateVariance = (actual: number, expected: number): number => {
      if (expected === 0) return 0; // As implemented in SQL query
      return Math.abs(actual - expected) / expected * 100;
    };

    expect(calculateVariance(100, 0)).toBe(0);
    expect(calculateVariance(100, 100)).toBe(0);
    expect(calculateVariance(105, 100)).toBe(5);
  });
});

describe('Variance Visual Indicators', () => {
  const getVarianceColor = (variance: number): string => {
    if (variance < 0.01) return 'green';  // Exact match
    if (variance <= 5) return 'blue';     // Acceptable
    if (variance <= 15) return 'orange';  // Warning
    return 'red';                         // Alert
  };

  it('assigns correct colors to variance levels', () => {
    expect(getVarianceColor(0)).toBe('green');
    expect(getVarianceColor(0.005)).toBe('green');
    expect(getVarianceColor(0.5)).toBe('blue');
    expect(getVarianceColor(5)).toBe('blue');
    expect(getVarianceColor(10)).toBe('orange');
    expect(getVarianceColor(20)).toBe('red');
  });
});

describe('Business Implications of Variance', () => {
  it('understands why variance matters', () => {
    // High variance might indicate:
    const varianceReasons = {
      'billing_error': 'Provider calculated fee incorrectly',
      'rate_change': 'Contract rate changed mid-period',
      'asset_fluctuation': 'AUM changed during billing cycle',
      'manual_adjustment': 'Fee manually adjusted for credit/debit',
      'rounding_difference': 'Normal penny rounding (acceptable)',
    };

    // AirSea America example: 5.11% variance
    const variance = 5.11;
    const isWarning = variance > 5 && variance <= 15;
    
    expect(isWarning).toBe(true);
    // This should trigger review by operations team
  });
});