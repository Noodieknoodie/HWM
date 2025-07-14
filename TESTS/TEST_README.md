# TESTS/TEST_README.md

# HWM 401k Payment Tracker - Testing Proposal

## Executive Summary

This testing strategy focuses on pragmatic, value-driven testing for a business-critical internal Teams application. Our approach prioritizes testing the most critical business logic and data flows while keeping the test suite maintainable and fast-running.

## Testing Philosophy

- **Practical Over Theoretical**: Focus on tests that catch real bugs in actual usage patterns
- **Business Logic First**: Prioritize testing payment calculations, compliance status, and data accuracy
- **Minimal Mocking**: Leverage real API responses and database views where possible
- **Fast Feedback**: Keep test runs under 30 seconds for developer productivity
- **AI-Maintainable**: Write tests that future AI agents can understand and update

## Testing Stack

### Core Tools
- **Vitest**: Modern, fast test runner with excellent TypeScript support
- **React Testing Library**: For component testing that reflects user behavior
- **MSW (Mock Service Worker)**: For API mocking when needed
- **@testing-library/user-event**: For realistic user interaction simulation

### Why This Stack?
- Vitest is significantly faster than Jest and has better ESM support
- React Testing Library encourages testing user behavior over implementation details
- MSW allows testing against realistic API scenarios without complex mocking
- All tools have excellent TypeScript integration

## Test Categories

### 1. Critical Business Logic Tests (Priority: HIGH)
**Location**: `src/__tests__/business-logic/`

#### Payment Calculations
- Fee calculation accuracy (percentage vs flat rate)
- Variance calculations and thresholds
- Period assignment logic (monthly/quarterly)
- Expected vs actual fee comparisons

#### Compliance Status
- Payment status determination (Due/Paid)
- Current period detection
- Provider grouping logic
- Quarter-to-month mapping

### 2. Data Flow Integration Tests (Priority: HIGH)
**Location**: `src/__tests__/integration/`

#### API Client Tests
- Error handling for Azure Data API responses
- Retry logic and timeout behavior
- Response transformation and validation
- Authentication flow

#### Custom Hooks Tests
- `usePayments`: CRUD operations, data refresh
- `useClientDashboard`: Data aggregation, status calculations
- `usePeriods`: Period selection and validation
- State synchronization across hooks

### 3. Critical Component Tests (Priority: MEDIUM)
**Location**: `src/__tests__/components/`

#### Payment Recording Flow
- `PaymentForm`: Validation, period selection, fee calculations
- `PaymentHistory`: Edit/delete operations, variance display
- `ClientSearch`: Search and selection behavior

#### Dashboard Components
- `CurrentStatusCard`: Status display logic
- `GridAlignedCard`: Data presentation consistency
- Error boundaries and loading states

### 4. Utility Function Tests (Priority: HIGH)
**Location**: `src/__tests__/utils/`

- Date formatting and period calculations
- Number formatting and currency display
- Error message extraction
- Data validation helpers

### 5. E2E Critical Path Tests (Priority: MEDIUM)
**Location**: `e2e/`

Using Playwright for critical user journeys:
- Record a payment end-to-end
- View and edit payment history
- Navigate between clients
- Export data

## Test Data Strategy

### Fixtures
**Location**: `src/__tests__/fixtures/`

- Representative client data covering all provider types
- Payment data with various variance scenarios
- Period data for different years and schedules
- Error response samples from Azure

### Database View Mocks
Since business logic lives in SQL views, we'll create fixtures that mirror view outputs:
- `dashboard_view` responses
- `payment_history_view` responses
- `quarterly_summary_aggregated` responses

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. Set up Vitest configuration
2. Create test utilities and helpers
3. Implement MSW handlers for core endpoints
4. Write first business logic tests for payment calculations

### Phase 2: Core Coverage (Week 2)
1. Complete business logic test suite
2. Test critical hooks (usePayments, useClientDashboard)
3. Test API client error handling
4. Add payment form validation tests

### Phase 3: Integration & UI (Week 3)
1. Component integration tests
2. User flow tests for payment recording
3. Dashboard data accuracy tests
4. Error boundary and edge case tests

### Phase 4: E2E & Polish (Week 4)
1. Playwright setup for E2E tests
2. Critical path E2E scenarios
3. Performance benchmarks
4. Documentation and CI integration

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

### Test Commands
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --dir src/__tests__",
    "test:integration": "vitest run --dir src/__tests__/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Success Metrics

- **Coverage**: 80%+ for business logic, 60%+ overall
- **Speed**: Full test suite runs in < 30 seconds
- **Reliability**: Zero flaky tests
- **Maintainability**: New features include tests
- **Business Value**: Catch fee calculation errors before production

## Non-Goals

- 100% code coverage (diminishing returns)
- Testing every UI variation
- Complex mocking of Azure infrastructure
- Testing third-party library internals
- Snapshot tests (high maintenance, low value)

## Maintenance Guidelines

### For Future AI Agents
- Each test file starts with a comment explaining its purpose
- Use descriptive test names that explain the business requirement
- Include examples of expected API responses in comments
- Mark flaky tests with `test.skip` and a TODO comment
- Keep test files under 200 lines for easy parsing

### Test Review Checklist
- [ ] Does the test name clearly describe what's being tested?
- [ ] Is the test testing behavior, not implementation?
- [ ] Are magic numbers explained or extracted to constants?
- [ ] Would an AI understand this test in 6 months?
- [ ] Is the test fast (< 100ms for unit tests)?

## Getting Started

```bash
# Install test dependencies
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event msw @vitest/coverage-v8

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test -- --ui

# Generate coverage report
npm run test:coverage
```

## Questions for Stakeholder Review

1. Are there specific compliance scenarios that must never fail?
2. What level of precision is required for fee calculations (decimals)?
3. Should we test against production database views or mocked data?
4. Are there any regulatory requirements for test documentation?
5. What's the acceptable test execution time for the CI pipeline?

---

This testing strategy balances comprehensive coverage with practical maintainability, ensuring the HWM 401k Payment Tracker remains reliable and accurate for its critical business functions.