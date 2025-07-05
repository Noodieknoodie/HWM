// frontend/src/test/testUtils.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import { AuthProvider } from '../components/AuthProvider'
import { createMockPublicClientApplication } from './mocks/msalMocks'

interface AllTheProvidersProps {
  children: React.ReactNode
}

const mockPca = createMockPublicClientApplication()

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <MsalProvider instance={mockPca}>
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </MsalProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }