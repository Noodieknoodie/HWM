// frontend/src/test/mocks/msalMocks.ts
import { AccountInfo, PublicClientApplication, EventType } from '@azure/msal-browser'
import { vi } from 'vitest'

export const mockAccount: AccountInfo = {
  homeAccountId: 'test-home-account-id',
  environment: 'login.windows.net',
  tenantId: 'test-tenant-id',
  username: 'test@example.com',
  localAccountId: 'test-local-account-id',
  name: 'Test User',
}

export const createMockPublicClientApplication = () => {
  const mockPca = {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAllAccounts: vi.fn().mockReturnValue([mockAccount]),
    getActiveAccount: vi.fn().mockReturnValue(mockAccount),
    setActiveAccount: vi.fn(),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
    loginRedirect: vi.fn().mockResolvedValue(undefined),
    loginPopup: vi.fn().mockResolvedValue({
      account: mockAccount,
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
      scopes: ['User.Read'],
    }),
    logoutRedirect: vi.fn().mockResolvedValue(undefined),
    acquireTokenSilent: vi.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      account: mockAccount,
      scopes: ['api://test-client-id/access_as_user'],
    }),
    acquireTokenPopup: vi.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      account: mockAccount,
      scopes: ['api://test-client-id/access_as_user'],
    }),
    addEventCallback: vi.fn().mockReturnValue('callback-id'),
    removeEventCallback: vi.fn(),
  }

  return mockPca as unknown as PublicClientApplication
}

export const mockMsalConfig = {
  auth: {
    clientId: 'test-client-id',
    authority: 'https://login.microsoftonline.com/test-tenant-id',
    redirectUri: 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}