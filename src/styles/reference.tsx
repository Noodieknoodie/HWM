// src/styles/reference.tsx
/**
 * HWM Style Reference Guide
 * 
 * This file contains standardized component patterns and style classes
 * to ensure consistency across the application.
 */

export const StyleReference = {
  // Spacing Standards
  spacing: {
    cards: "p-6",
    tableCells: "px-6 py-4",
    tableHeaders: "px-6 py-3",
    buttons: "px-4 py-2",
    pageContainers: "px-4 sm:px-6 lg:px-8 py-8", // Applied by PageLayout
  },

  // Typography Hierarchy
  typography: {
    pageHeader: "text-2xl font-bold text-gray-900",
    sectionHeader: "text-lg font-semibold text-gray-900",
    cardHeader: "text-sm font-semibold text-gray-600",
    bodyText: "text-sm text-gray-900",
    mutedText: "text-sm text-gray-500",
    smallText: "text-xs text-gray-600",
  },

  // Color Scheme
  colors: {
    // Primary action color
    primary: {
      background: "bg-blue-600",
      hover: "hover:bg-blue-700",
      text: "text-blue-600",
      border: "border-blue-600",
      ring: "focus:ring-blue-500",
    },
    // Gray hierarchy for text
    text: {
      primary: "text-gray-900",
      secondary: "text-gray-700",
      muted: "text-gray-500",
      disabled: "text-gray-400",
    },
    // Background colors
    background: {
      white: "bg-white",
      gray50: "bg-gray-50",
      gray100: "bg-gray-100",
    },
    // Border colors
    border: {
      default: "border-gray-200",
      divider: "divide-gray-200",
    },
  },

  // Component Patterns
  components: {
    // Dashboard Cards
    dashboardCard: "bg-white rounded-lg p-6 border border-gray-200 flex flex-col h-full",
    
    // Primary Button
    primaryButton: "px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
    
    // Secondary Button
    secondaryButton: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
    
    // Table
    table: {
      container: "overflow-x-auto",
      table: "min-w-full divide-y divide-gray-200",
      header: "bg-gray-50",
      headerCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
      body: "bg-white divide-y divide-gray-200",
      cell: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
      rowHover: "hover:bg-gray-50",
    },
    
    // Form Elements
    input: "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm",
    
    // Status Indicators
    statusDot: {
      gray: "w-2 h-2 bg-gray-400 rounded-full inline-block", // For pending items
    },
    
    // Variance Indicators
    variance: {
      text: "text-gray-900", // All variance amounts in gray
      indicator: "text-amber-500 ml-1", // Amber dot for >10% variance
    },
  },

  // Layout Patterns
  layout: {
    // Page header with gradient line
    pageHeader: `
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Page Title
        </h1>
        <div className="h-1 w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-200 rounded-full"></div>
      </div>
    `,
    
    // Grid layout for dashboard cards
    dashboardGrid: "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4",
  },
};

// Example usage components demonstrating the patterns

export const ExampleCard = () => (
  <div className={StyleReference.components.dashboardCard}>
    <h3 className={StyleReference.typography.cardHeader}>Card Title</h3>
    <div className="flex-grow">
      <p className={StyleReference.typography.bodyText}>Card content goes here</p>
    </div>
  </div>
);

export const ExampleButton = () => (
  <button className={StyleReference.components.primaryButton}>
    Primary Action
  </button>
);

export const ExampleVariance = ({ amount, percent }: { amount: number; percent: number }) => (
  <span className={StyleReference.components.variance.text}>
    ${amount.toLocaleString()}
    {Math.abs(percent) > 10 && (
      <span className={StyleReference.components.variance.indicator}>•</span>
    )}
  </span>
);