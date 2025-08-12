#!/bin/bash

# Update all imports from api/client to context/ApiContext
FILES=(
  "src/hooks/usePayments.ts"
  "src/hooks/usePaymentDefaults.ts"
  "src/hooks/usePeriods.ts"
  "src/hooks/usePaymentCompliance.ts"
  "src/components/export/ExportDataPage.tsx"
  "src/components/contracts/EditContractModal.tsx"
  "src/components/clients/EditClientModal.tsx"
  "src/components/compliance/PaymentComplianceModal.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating: $file"
    # Replace @/api/client with @/context/ApiContext
    sed -i "s|import { useDataApiClient } from '@/api/client'|import { useDataApiClient } from '@/context/ApiContext'|g" "$file"
    # Replace ../api/client with ../context/ApiContext
    sed -i "s|import { useDataApiClient } from '../api/client'|import { useDataApiClient } from '../context/ApiContext'|g" "$file"
    # Replace ../../api/client with ../../context/ApiContext
    sed -i "s|import { useDataApiClient } from '../../api/client'|import { useDataApiClient } from '../../context/ApiContext'|g" "$file"
  else
    echo "File not found: $file"
  fi
done

echo "✅ Import updates complete"