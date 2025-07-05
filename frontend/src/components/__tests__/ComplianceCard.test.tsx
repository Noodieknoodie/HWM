// frontend/src/components/__tests__/ComplianceCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/testUtils'
import ComplianceCard from '../ComplianceCard'
import { mockDashboardData } from '../../test/mocks/apiMocks'

describe('ComplianceCard', () => {
  const mockMetrics = mockDashboardData.metrics
  const mockQuarterlyTrends = mockDashboardData.quarterlyTrends

  it('renders compliance status correctly', () => {
    render(
      <ComplianceCard 
        metrics={mockMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    expect(screen.getByText('Compliance Status')).toBeInTheDocument()
  })

  it('displays "At Risk" status for negative variance', () => {
    render(
      <ComplianceCard 
        metrics={mockMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    expect(screen.getByText('At Risk')).toBeInTheDocument()
    const statusElement = screen.getByText('At Risk')
    expect(statusElement).toHaveClass('text-red-700')
  })

  it('displays "Good Standing" status for positive variance', () => {
    const positiveMetrics = {
      ...mockMetrics,
      VariancePercentage: 5.5,
      TotalVariance: 8000,
    }
    
    render(
      <ComplianceCard 
        metrics={positiveMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    expect(screen.getByText('Good Standing')).toBeInTheDocument()
    const statusElement = screen.getByText('Good Standing')
    expect(statusElement).toHaveClass('text-green-700')
  })

  it('displays "Warning" status for small negative variance', () => {
    const warningMetrics = {
      ...mockMetrics,
      VariancePercentage: -3.5, // Between -5% and 0%
    }
    
    render(
      <ComplianceCard 
        metrics={warningMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    expect(screen.getByText('Warning')).toBeInTheDocument()
    const statusElement = screen.getByText('Warning')
    expect(statusElement).toHaveClass('text-yellow-700')
  })

  it('displays quarterly trends correctly', () => {
    render(
      <ComplianceCard 
        metrics={mockMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    expect(screen.getByText('Quarterly Trends')).toBeInTheDocument()
    
    // Q1 2024
    expect(screen.getByText('Q1 2024')).toBeInTheDocument()
    expect(screen.getByText('$45,000.00')).toBeInTheDocument()
    expect(screen.getByText('-$3,000.00')).toBeInTheDocument()
    
    // Q2 2024
    expect(screen.getByText('Q2 2024')).toBeInTheDocument()
    expect(screen.getByText('$50,000.00')).toBeInTheDocument()
    expect(screen.getByText('-$2,000.00')).toBeInTheDocument()
  })

  it('handles empty quarterly trends', () => {
    render(
      <ComplianceCard 
        metrics={mockMetrics} 
        quarterlyTrends={[]} 
      />
    )
    
    expect(screen.getByText('Quarterly Trends')).toBeInTheDocument()
    expect(screen.queryByText('Q1 2024')).not.toBeInTheDocument()
  })

  it('displays variance percentage correctly', () => {
    render(
      <ComplianceCard 
        metrics={mockMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    expect(screen.getByText('Variance %')).toBeInTheDocument()
    expect(screen.getByText('-6.25%')).toBeInTheDocument()
  })

  it('shows correct icon for negative variance', () => {
    render(
      <ComplianceCard 
        metrics={mockMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    // Check for the down arrow icon (↓)
    const varianceElement = screen.getByText('-6.25%')
    expect(varianceElement.textContent).toContain('↓')
  })

  it('shows correct icon for positive variance', () => {
    const positiveMetrics = {
      ...mockMetrics,
      VariancePercentage: 3.5,
    }
    
    render(
      <ComplianceCard 
        metrics={positiveMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    // Check for the up arrow icon (↑)
    const varianceElement = screen.getByText('3.50%')
    expect(varianceElement.textContent).toContain('↑')
  })

  it('formats quarterly variance with correct colors', () => {
    render(
      <ComplianceCard 
        metrics={mockMetrics} 
        quarterlyTrends={mockQuarterlyTrends} 
      />
    )
    
    const negativeVariances = screen.getAllByText(/-\$\d+,\d+\.\d+/)
    negativeVariances.forEach(element => {
      expect(element).toHaveClass('text-red-600')
    })
  })
})