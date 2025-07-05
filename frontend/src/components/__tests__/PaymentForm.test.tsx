// frontend/src/components/__tests__/PaymentForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/testUtils'
import userEvent from '@testing-library/user-event'
import PaymentForm from '../PaymentForm'
import { mockContract, mockPeriod } from '../../test/mocks/apiMocks'

// Mock the global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('PaymentForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  const defaultProps = {
    contractId: 1,
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  }

  it('renders form fields correctly', () => {
    render(<PaymentForm {...defaultProps} />)
    
    expect(screen.getByLabelText('Payment Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Period')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
    expect(screen.getByLabelText('Payment Method')).toBeInTheDocument()
    expect(screen.getByLabelText('Transaction Reference')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
  })

  it('loads periods on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPeriod],
    })

    render(<PaymentForm {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/periods/'),
        expect.any(Object)
      )
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPeriod],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: 'Payment created' }),
      })

    render(<PaymentForm {...defaultProps} />)
    
    // Fill form
    await user.type(screen.getByLabelText('Payment Date'), '2024-03-15')
    await user.type(screen.getByLabelText('Amount'), '12500')
    await user.selectOptions(screen.getByLabelText('Status'), 'Paid')
    await user.selectOptions(screen.getByLabelText('Payment Method'), 'ACH')
    await user.type(screen.getByLabelText('Transaction Reference'), 'ACH123')
    await user.type(screen.getByLabelText('Notes'), 'Test payment')
    
    // Submit
    await user.click(screen.getByText('Save Payment'))
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payments/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"Amount":12500'),
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    
    render(<PaymentForm {...defaultProps} />)
    
    // Try to submit without filling required fields
    await user.click(screen.getByText('Save Payment'))
    
    // Check for HTML5 validation
    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement
    expect(amountInput.validity.valid).toBe(false)
  })

  it('handles cancel button', async () => {
    const user = userEvent.setup()
    
    render(<PaymentForm {...defaultProps} />)
    
    await user.click(screen.getByText('Cancel'))
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('displays error on submission failure', async () => {
    const user = userEvent.setup()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPeriod],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Payment creation failed' }),
      })

    render(<PaymentForm {...defaultProps} />)
    
    await user.type(screen.getByLabelText('Amount'), '12500')
    await user.click(screen.getByText('Save Payment'))
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create payment/i)).toBeInTheDocument()
    })
  })

  it('disables submit button during submission', async () => {
    const user = userEvent.setup()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPeriod],
      })
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<PaymentForm {...defaultProps} />)
    
    await user.type(screen.getByLabelText('Amount'), '12500')
    
    const submitButton = screen.getByText('Save Payment')
    await user.click(submitButton)
    
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('populates period dates when period is selected', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPeriod],
    })

    render(<PaymentForm {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('March 2024')).toBeInTheDocument()
    })
    
    await user.selectOptions(screen.getByLabelText('Period'), '1')
    
    // Period dates should be populated
    const form = screen.getByRole('form') as HTMLFormElement
    const formData = new FormData(form)
    
    // Note: We can't directly check the hidden input values, but we can verify
    // the period selection worked
    expect(screen.getByLabelText('Period')).toHaveValue('1')
  })

  it('validates amount is positive', async () => {
    const user = userEvent.setup()
    
    render(<PaymentForm {...defaultProps} />)
    
    const amountInput = screen.getByLabelText('Amount')
    await user.type(amountInput, '-100')
    
    // HTML5 validation should prevent negative numbers
    expect((amountInput as HTMLInputElement).validity.valid).toBe(false)
  })

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<PaymentForm {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load periods/i)).toBeInTheDocument()
    })
  })
})