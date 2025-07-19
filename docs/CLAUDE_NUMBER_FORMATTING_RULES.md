# 🏆 HWM Number Formatting Gold Standard

## 📦 Database Storage

### Percentages
```sql
-- Stored as decimal fraction
percent_rate: 0.001 → 0.1% monthly rate
percent_rate: 0.0007 → 0.07% monthly rate
```

### Currency
```sql
-- Stored as float (watch for floating point!)
flat_rate: 3000.00 → $3,000
actual_fee: 4532.789999999 → Need to clean!
```

## 🖥️ App Display

### Percentages
```typescript
// Always show as percentage with 2 decimals
const displayRate = (percent_rate * 100).toFixed(2) + "%"
0.001 → "0.10%"
0.0007 → "0.07%"
```

### Currency  
```typescript
// Use Intl formatter with 2 decimals
const displayCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(amount)

3000 → "$3,000.00"
4532.789999 → "$4,532.79"
```

### Rate Conversions
```typescript
// Database stores MONTHLY rate, calculate others
const rates = {
  monthly: (percent_rate * 100).toFixed(2),    // 0.001 → "0.10"
  quarterly: (percent_rate * 100 * 3).toFixed(2), // 0.001 → "0.30"
  annual: (percent_rate * 100 * 12).toFixed(2)    // 0.001 → "1.20"
}
```

## 📄 CSV Export (Raw Numbers)

### Best Practice Format
```csv
provider,client,rate,expected,actual,variance
JOHN HANCOCK,,0.30,13550.00,13550.00,0.00
,Acme Corp,0.30,4500.00,4500.00,0.00
```

### Implementation
```typescript
// Percentages: multiply by 100, no % symbol
csvRate: +(percent_rate * 100).toFixed(2)  // 0.001 → 0.10

// Currency: round to 2 decimals, no $ symbol  
csvAmount: +actual_fee.toFixed(2)  // 4532.789999 → 4532.79

// Ensure number type with unary +
```

## 📊 Excel Export (With Formatting)

### Cell Values (Raw)
```typescript
// Percentages: as decimal percentage
excelRate: +(percent_rate * 100).toFixed(2)  // 0.001 → 0.10

// Currency: rounded number
excelAmount: +actual_fee.toFixed(2)  // 4532.789999 → 4532.79
```

### Column Formatting
```typescript
// After creating worksheet, apply formats
worksheet.getColumn('C').numFmt = '0.00%';     // Shows 0.10 as "0.10%"
worksheet.getColumn('D').numFmt = '$#,##0.00'; // Shows 4500 as "$4,500.00"
worksheet.getColumn('E').numFmt = '$#,##0.00';
worksheet.getColumn('F').numFmt = '$#,##0.00';
```

## 🧮 Calculation Rules

### Expected Fee
```typescript
// Percentage-based
expectedFee = Math.round(aum * percent_rate * 100) / 100  // Round to cents

// Flat fee
expectedFee = flat_rate  // Already clean
```

### Variance
```typescript
// Always round to 2 decimals
variance = +(actual - expected).toFixed(2)
variancePercent = +((variance / expected) * 100).toFixed(2)
```

## ⚡ Quick Reference

| Data Type | Database | Display | CSV (Raw) | Excel (Raw) | Excel Format |
|-----------|----------|---------|-----------|-------------|--------------|
| % Rate | 0.001 | "0.10%" | 0.10 | 0.10 | 0.00% |
| $ Amount | 3000.00 | "$3,000.00" | 3000.00 | 3000.00 | $#,##0.00 |
| Variance % | 0.05 | "5.00%" | 5.00 | 5.00 | 0.00% |

## 🔧 Floating Point Cleanup

```typescript
// ALWAYS clean floats before display/export
function cleanFloat(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Or simpler
const clean = (val: number) => +val.toFixed(2);
```

## 📝 Summary

- **Database**: Raw decimals (0.001 for 0.1%)
- **Display**: Formatted strings with symbols
- **CSV**: Raw numbers, 2 decimals, no symbols
- **Excel**: Raw numbers with Excel formatting applied