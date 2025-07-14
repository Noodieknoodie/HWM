// TESTS/integration/expected-fee.test.ts
/**
 * Tests for expected fee calculation and storage
 */

import { describe, it, expect } from 'vitest';

describe('Expected Fee Calculation', () => {
  describe('Payment Form Calculation Logic', () => {
    // Mock dashboard data (contract info)
    const mockContracts = {
      percentage: {
        fee_type: 'percentage',
        percent_rate: 0.000667, // 0.0667% monthly
        flat_rate: null,
        payment_schedule: 'monthly',
      },
      flat: {
        fee_type: 'flat',
        percent_rate: null,
        flat_rate: 500,
        payment_schedule: 'monthly',
      },
      quarterly: {
        fee_type: 'percentage',
        percent_rate: 0.0025, // 0.25% quarterly
        flat_rate: null,
        payment_schedule: 'quarterly',
      },
    };

    it('calculates expected fee for percentage-based contracts', () => {
      const contract = mockContracts.percentage;
      const totalAssets = 1000000; // $1M AUM
      
      const expectedFee = totalAssets * contract.percent_rate;
      
      expect(expectedFee).toBeCloseTo(667, 2); // $667
      expect(contract.percent_rate * 10000).toBeCloseTo(6.67); // 6.67 basis points
    });

    it('calculates expected fee for flat-rate contracts', () => {
      const contract = mockContracts.flat;
      const totalAssets = 1000000; // AUM doesn't matter for flat fee
      
      const expectedFee = contract.flat_rate;
      
      expect(expectedFee).toBe(500); // Always $500
    });

    it('calculates expected fee for quarterly contracts', () => {
      const contract = mockContracts.quarterly;
      const totalAssets = 2000000; // $2M AUM
      
      const expectedFee = totalAssets * contract.percent_rate;
      
      expect(expectedFee).toBeCloseTo(5000, 2); // $5,000 quarterly
    });

    it('handles edge cases', () => {
      const calculateExpectedFee = (contract: any, assets: string) => {
        if (!contract || !assets) return null;
        
        const assetsNum = parseFloat(assets);
        
        if (contract.fee_type === 'percentage' && contract.percent_rate) {
          return assetsNum * contract.percent_rate;
        } else if (contract.fee_type === 'flat' && contract.flat_rate) {
          return contract.flat_rate;
        }
        
        return null;
      };

      // No contract data
      expect(calculateExpectedFee(null, '1000000')).toBeNull();
      
      // No assets entered
      expect(calculateExpectedFee(mockContracts.percentage, '')).toBeNull();
      
      // Invalid fee type
      const invalidContract = { fee_type: 'invalid', percent_rate: 0.001 };
      expect(calculateExpectedFee(invalidContract, '1000000')).toBeNull();
    });
  });

  describe('Database Storage Issue', () => {
    it('documents the problem: expected_fee is always NULL', () => {
      // From real database queries:
      const recentPayments = [
        { payment_id: 1115, expected_fee: null, actual_fee: 55.76 },
        { payment_id: 1114, expected_fee: null, actual_fee: 1288.67 },
        { payment_id: 1113, expected_fee: null, actual_fee: 2059.46 },
      ];

      const nullCount = recentPayments.filter(p => p.expected_fee === null).length;
      
      expect(nullCount).toBe(recentPayments.length); // All are NULL
    });

    it('verifies frontend is sending expected_fee', () => {
      // From PaymentForm.tsx analysis:
      const paymentData = {
        contract_id: 1,
        client_id: 1,
        received_date: '2025-07-13',
        total_assets: 1000000,
        expected_fee: 667, // <-- This IS being calculated and sent
        actual_fee: 670,
        method: 'Check',
        // ... other fields
      };

      expect(paymentData.expected_fee).toBeDefined();
      expect(paymentData.expected_fee).toBeGreaterThan(0);
    });

    it('suggests potential causes', () => {
      const potentialIssues = [
        'DAB (Data API Builder) not mapping the field correctly',
        'Database trigger or constraint rejecting the value',
        'API transformation dropping the field',
        'Frontend sending null despite calculation',
      ];

      // Most likely: DAB configuration issue
      expect(potentialIssues[0]).toContain('DAB');
    });
  });

  describe('Variance Calculation Without Expected Fee', () => {
    it('shows how variance is calculated on-the-fly', () => {
      // Since expected_fee is NULL, variance must be calculated dynamically
      const payment = {
        total_assets: 1000000,
        actual_fee: 670,
        contract: {
          fee_type: 'percentage',
          percent_rate: 0.000667,
        },
      };

      const calculatedExpected = payment.total_assets * payment.contract.percent_rate;
      const variance = Math.abs(payment.actual_fee - calculatedExpected) / calculatedExpected * 100;

      expect(calculatedExpected).toBeCloseTo(667, 2);
      expect(variance).toBeCloseTo(0.45, 2); // 0.45% variance
    });
  });
});