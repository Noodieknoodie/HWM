// frontend/src/test/mocks/apiMocks.ts
export const mockClient = {
  ClientID: 1,
  ClientName: 'Test Client',
  ClientType: 'Enterprise',
  IsActive: true,
  TotalContracts: 5,
  ActiveContracts: 3,
  TotalRevenue: 150000,
  LastPaymentDate: '2024-03-15',
  CreatedAt: '2024-01-01T00:00:00Z',
}

export const mockDashboardData = {
  client: {
    ClientID: 1,
    ClientName: 'Test Client',
    ClientType: 'Enterprise',
    IsActive: true,
    TotalContracts: 5,
    ActiveContracts: 3,
    CreatedAt: '2024-01-01T00:00:00Z',
  },
  metrics: {
    TotalRevenue: 150000,
    TotalExpectedRevenue: 160000,
    TotalVariance: -10000,
    VariancePercentage: -6.25,
    LastPaymentDate: '2024-03-15',
    PaymentsLast30Days: 8,
    AvgPaymentAmount: 12500,
  },
  quarterlyTrends: [
    {
      Quarter: 1,
      Year: 2024,
      Revenue: 45000,
      ExpectedRevenue: 48000,
      Variance: -3000,
      PaymentCount: 9,
    },
    {
      Quarter: 2,
      Year: 2024,
      Revenue: 50000,
      ExpectedRevenue: 52000,
      Variance: -2000,
      PaymentCount: 10,
    },
  ],
}

export const mockPayment = {
  PaymentID: 1,
  ContractID: 1,
  PaymentDate: '2024-03-15',
  PeriodStart: '2024-03-01',
  PeriodEnd: '2024-03-31',
  Amount: 12500,
  Status: 'Paid',
  PaymentMethod: 'ACH',
  TransactionReference: 'ACH123456',
  Notes: 'March payment',
  PaymentVariance: -500,
  VariancePercentage: -3.85,
  ClientName: 'Test Client',
  ContractName: 'Main Contract',
}

export const mockContract = {
  ContractID: 1,
  ClientID: 1,
  ContractName: 'Main Contract',
  ContractType: 'Fixed',
  StartDate: '2024-01-01',
  EndDate: '2024-12-31',
  BaseAmount: 10000,
  PaymentFrequency: 'Monthly',
  FeeType: 'Percentage',
  FeeAmount: 2.5,
  Notes: 'Primary service contract',
  IsActive: true,
  ClientName: 'Test Client',
}

export const mockPeriod = {
  PeriodID: 1,
  Year: 2024,
  Month: 3,
  DisplayName: 'March 2024',
  StartDate: '2024-03-01',
  EndDate: '2024-03-31',
  IsComplete: true,
}