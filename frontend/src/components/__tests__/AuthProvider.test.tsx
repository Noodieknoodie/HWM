// frontend/src/components/__tests__/AuthProvider.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MsalProvider } from '@azure/msal-react'
import { AuthProvider, useAuth } from '../AuthProvider'
import { createMockPublicClientApplication, mockAccount } from '../../test/mocks/msalMocks'

describe('AuthProvider', () => {
  let mockPca: ReturnType<typeof createMockPublicClientApplication>

  beforeEach(() => {
    mockPca = createMockPublicClientApplication()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MsalProvider instance={mockPca}>
      <AuthProvider>{children}</AuthProvider>
    </MsalProvider>
  )

  it('provides authentication context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current).toBeDefined()
    expect(result.current).toHaveProperty('login')
    expect(result.current).toHaveProperty('logout')
    expect(result.current).toHaveProperty('getToken')
    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('isAuthenticated')
  })

  it('returns user when authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current.user).toBe(mockAccount)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('returns null user when not authenticated', () => {
    mockPca.getActiveAccount = vi.fn().mockReturnValue(null)
    
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('handles login correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await result.current.login()
    
    expect(mockPca.loginRedirect).toHaveBeenCalledWith({
      scopes: ['User.Read', 'api://your-client-id/access_as_user']
    })
  })

  it('handles logout correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await result.current.logout()
    
    expect(mockPca.logoutRedirect).toHaveBeenCalledWith({
      postLogoutRedirectUri: '/'
    })
  })

  it('gets token successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    const token = await result.current.getToken()
    
    expect(token).toBe('mock-access-token')
    expect(mockPca.acquireTokenSilent).toHaveBeenCalledWith({
      scopes: ['api://your-client-id/access_as_user'],
      account: mockAccount
    })
  })

  it('falls back to popup when silent token acquisition fails', async () => {
    mockPca.acquireTokenSilent = vi.fn().mockRejectedValue(new Error('Silent failed'))
    
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    const token = await result.current.getToken()
    
    expect(token).toBe('mock-access-token')
    expect(mockPca.acquireTokenPopup).toHaveBeenCalledWith({
      scopes: ['api://your-client-id/access_as_user']
    })
  })

  it('returns null token when not authenticated', async () => {
    mockPca.getActiveAccount = vi.fn().mockReturnValue(null)
    
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    const token = await result.current.getToken()
    
    expect(token).toBeNull()
  })

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
    
    consoleSpy.mockRestore()
  })
})