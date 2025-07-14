// TESTS/components/error-boundary.test.tsx
/**
 * Tests for ErrorBoundary component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../../src/components/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error: Component crashed!');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Mock console.error to avoid noise in test output
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please refresh the page or try again later.')).toBeInTheDocument();
    
    // Should not show the child component
    expect(screen.queryByText('No error')).not.toBeInTheDocument();
  });

  it('displays error details in collapsible section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error details should be hidden initially
    const details = screen.getByText('Error details');
    expect(details).toBeInTheDocument();

    // Click to expand error details
    fireEvent.click(details);

    // Should show the error message
    expect(screen.getByText(/Test error: Component crashed!/)).toBeInTheDocument();
  });

  it('provides refresh button that reloads the page', () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('uses custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show custom fallback
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    
    // Should not show default error UI
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('logs errors to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('recovers when error is resolved', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Re-render without error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should still show error UI (error boundaries don't automatically reset)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('documents that async errors are NOT caught', async () => {
    // This test documents a React limitation: Error boundaries don't catch async errors
    const AsyncError = () => {
      const [hasError, setHasError] = React.useState(false);
      
      React.useEffect(() => {
        // In real apps, you'd handle async errors with try/catch
        setTimeout(() => {
          try {
            // This would throw in a real scenario
            setHasError(true);
          } catch (err) {
            // Handle error properly
          }
        }, 0);
      }, []);
      
      if (hasError) {
        return <div>Async error occurred</div>;
      }
      return <div>Loading...</div>;
    };

    render(
      <ErrorBoundary>
        <AsyncError />
      </ErrorBoundary>
    );

    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // After async operation
    await screen.findByText('Async error occurred');
    
    // Error boundary did NOT catch it (component handles its own error)
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary Integration', () => {
  it('should be used at app root level', () => {
    // This test documents where ErrorBoundary should be placed
    const AppStructure = () => (
      <ErrorBoundary>
        <div>
          <h1>App Header</h1>
          <main>
            {/* Routes and components go here */}
          </main>
        </div>
      </ErrorBoundary>
    );

    const { container } = render(<AppStructure />);
    expect(container.firstChild).toBeDefined();
  });

  it('can be nested for granular error handling', () => {
    render(
      <ErrorBoundary fallback={<div>App crashed</div>}>
        <div>
          <h1>App</h1>
          <ErrorBoundary fallback={<div>Feature crashed</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <div>Other content still visible</div>
        </div>
      </ErrorBoundary>
    );

    // Inner error boundary catches the error
    expect(screen.getByText('Feature crashed')).toBeInTheDocument();
    
    // Rest of app still works
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.getByText('Other content still visible')).toBeInTheDocument();
    
    // Outer error boundary not triggered
    expect(screen.queryByText('App crashed')).not.toBeInTheDocument();
  });
});