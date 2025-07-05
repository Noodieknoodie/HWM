// frontend/src/components/__tests__/PaymentInfoCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/testUtils'
import PaymentInfoCard from '../PaymentInfoCard'
import { mockDashboardData } from '../../test/mocks/apiMocks'

describe('PaymentInfoCard', () => {
  const mockMetrics = mockDashboardData.metrics

  it('renders payment metrics correctly', () => {
    render(<PaymentInfoCard metrics={mockMetrics} />)
    
    // Check title
    expect(screen.getByText('Payment Information')).toBeInTheDocument()
    
    // Check total revenue
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('$150,000.00')).toBeInTheDocument()
    
    // Check expected revenue
    expect(screen.getByText('Expected Revenue')).toBeInTheDocument()
    expect(screen.getByText('$160,000.00')).toBeInTheDocument()
    
    // Check variance
    expect(screen.getByText('Variance')).toBeInTheDocument()
    expect(screen.getByText('-$10,000.00')).toBeInTheDocument()
    expect(screen.getByText('(-6.25%)')).toBeInTheDocument()
  })

  it('displays negative variance with red color', () => {
    render(<PaymentInfoCard metrics={mockMetrics} />)
    
    const varianceElement = screen.getByText('-$10,000.00')
    expect(varianceElement).toHaveClass('text-red-600')
  })

  it('displays positive variance with green color', () => {
    const positiveMetrics = {
      ...mockMetrics,
      TotalVariance: 5000,
      VariancePercentage: 3.13,
    }
    
    render(<PaymentInfoCard metrics={positiveMetrics} />)
    
    const varianceElement = screen.getByText('$5,000.00')
    expect(varianceElement).toHaveClass('text-green-600')
  })

  it('displays recent activity correctly', () => {
    render(<PaymentInfoCard metrics={mockMetrics} />)
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('Last Payment')).toBeInTheDocument()
    expect(screen.getByText('Mar 15, 2024')).toBeInTheDocument()
    
    expect(screen.getByText('Payments (30 days)')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    
    expect(screen.getByText('Avg Payment')).toBeInTheDocument()
    expect(screen.getByText('$12,500.00')).toBeInTheDocument()
  })

  it('handles missing last payment date', () => {
    const metricsNoDate = {
      ...mockMetrics,
      LastPaymentDate: null,
    }
    
    render(<PaymentInfoCard metrics={metricsNoDate} />)
    
    expect(screen.getByText('Last Payment')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    const largeMetrics = {
      ...mockMetrics,
      TotalRevenue: 1234567.89,
      TotalExpectedRevenue: 1234567.89,
      AvgPaymentAmount: 123456.78,
    }
    
    render(<PaymentInfoCard metrics={largeMetrics} />)
    
    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument()
    expect(screen.getByText('$123,456.78')).toBeInTheDocument()
  })

  it('handles zero values correctly', () => {
    const zeroMetrics = {
      TotalRevenue: 0,
      TotalExpectedRevenue: 0,
      TotalVariance: 0,
      VariancePercentage: 0,
      LastPaymentDate: null,
      PaymentsLast30Days: 0,
      AvgPaymentAmount: 0,
    }
    
    render(<PaymentInfoCard metrics={zeroMetrics} />)
    
    expect(screen.getAllByText('$0.00')).toHaveLength(4) // Revenue, Expected, Variance, Avg
    expect(screen.getByText('(0.00%)')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Payments count
  })
})