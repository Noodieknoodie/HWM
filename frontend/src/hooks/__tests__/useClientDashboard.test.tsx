// frontend/src/hooks/__tests__/useClientDashboard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useClientDashboard } from '../useClientDashboard'
import { mockDashboardData, mockClient } from '../../test/mocks/apiMocks'
import { render } from '../../test/testUtils'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock useAuth hook
vi.mock('../../components/AuthProvider', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isAuthenticated: true,
    user: { username: 'test@example.com' },
  }),
}))

describe('useClientDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  it('fetches dashboard data successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    })

    const { result } = renderHook(() => useClientDashboard(1))

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.dashboard).toBeNull()
    expect(result.current.error).toBeNull()

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.dashboard).toEqual(mockDashboardData)
    expect(result.current.error).toBeNull()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard/1'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token',
        }),
      })
    )
  })

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useClientDashboard(1))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.dashboard).toBeNull()
    expect(result.current.error).toBe('Failed to fetch dashboard data')
  })

  it('handles non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Client not found' }),
    })

    const { result } = renderHook(() => useClientDashboard(1))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.dashboard).toBeNull()
    expect(result.current.error).toBe('Failed to fetch dashboard data')
  })

  it('does not fetch when clientId is null', () => {
    const { result } = renderHook(() => useClientDashboard(null))

    expect(result.current.loading).toBe(false)
    expect(result.current.dashboard).toBeNull()
    expect(result.current.error).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refetches when clientId changes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockDashboardData,
          client: { ...mockDashboardData.client, ClientID: 2 },
        }),
      })

    const { result, rerender } = renderHook(
      ({ clientId }) => useClientDashboard(clientId),
      { initialProps: { clientId: 1 } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.dashboard?.client.ClientID).toBe(1)

    // Change client ID
    rerender({ clientId: 2 })

    await waitFor(() => {
      expect(result.current.dashboard?.client.ClientID).toBe(2)
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('provides refetch function', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockDashboardData,
          metrics: {
            ...mockDashboardData.metrics,
            TotalRevenue: 200000,
          },
        }),
      })

    const { result } = renderHook(() => useClientDashboard(1))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.dashboard?.metrics.TotalRevenue).toBe(150000)

    // Call refetch
    result.current.refetch()

    await waitFor(() => {
      expect(result.current.dashboard?.metrics.TotalRevenue).toBe(200000)
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('sets loading state during refetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData,
    })

    const { result } = renderHook(() => useClientDashboard(1))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Start refetch
    result.current.refetch()
    
    // Should be loading again
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('clears previous error on successful refetch', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      })

    const { result } = renderHook(() => useClientDashboard(1))

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch dashboard data')
    })

    // Refetch
    result.current.refetch()

    await waitFor(() => {
      expect(result.current.error).toBeNull()
      expect(result.current.dashboard).toEqual(mockDashboardData)
    })
  })
})