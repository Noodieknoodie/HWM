#!/usr/bin/env python3
"""
Extract and combine performance/loading related code files for analysis.
"""

import os
from pathlib import Path

# Define the files relevant to performance/loading
PERFORMANCE_FILES = [
    # Main app entry and routing
    "src/App.tsx",
    "src/main.tsx",
    
    # API and data fetching
    "src/api/client.ts",
    "src/config/api.ts",
    
    # State management
    "src/stores/useAppStore.ts",
    
    # Caching utilities
    "src/utils/cache.ts",
    
    # All hooks (data fetching and state management)
    "src/hooks/useClientDashboard.ts",
    "src/hooks/useContacts.ts",
    "src/hooks/usePaymentCompliance.ts",
    "src/hooks/usePaymentDefaults.ts",
    "src/hooks/usePayments.ts",
    "src/hooks/usePeriods.ts",
    
    # Pages with significant data loading
    "src/pages/Summary.tsx",
    "src/pages/Payments.tsx",
    "src/pages/Contacts.tsx",
    "src/pages/Export.tsx",
    
    # Components with loading states
    "src/components/ClientSearch.tsx",
    "src/components/payment/PaymentHistory.tsx",
    "src/components/payment/PaymentForm.tsx",
    "src/components/compliance/PaymentComplianceModal.tsx",
    "src/components/contacts/ContactsModal.tsx",
    "src/components/export/ExportDataPage.tsx",
    
    # UI components for loading states
    "src/components/ui/Skeleton.tsx",
    
    # Error handling
    "src/components/ErrorBoundary.tsx",
    "src/utils/errorUtils.ts",
    
    # Export utilities (performance intensive)
    "src/utils/exportUtils.ts",
    
    # Build and config files
    "vite.config.ts",
    "tsconfig.json",
    "package.json",
    
    # Database config (affects data fetching)
    "staticwebapp.database.config.json",
    
    # Performance analysis documentation
    "CLAUDE_JOURNAL/2025-01-25-frontend-performance-analysis.md",
    "CLAUDE_JOURNAL/2025-01-25-api-orchestration-analysis.md",
    "CLAUDE_JOURNAL/2025-01-25-infrastructure-analysis.md",
    "CLAUDE_JOURNAL/2025-01-25-performance-synthesis-report.md",
    "CLAUDE_JOURNAL/2025-01-25-state-management-analysis.md",
    "CLAUDE_JOURNAL/2025-01-25-ux-performance-analysis.md",
]

def extract_files():
    """Extract and combine all performance-related files."""
    root_dir = Path.cwd()
    output_file = root_dir / "performance_code_dump.txt"
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("# Performance and Loading Related Code Files\n")
        outfile.write("# Generated for performance analysis discussion\n\n")
        
        files_found = 0
        files_missing = 0
        
        for file_path in PERFORMANCE_FILES:
            full_path = root_dir / file_path
            
            if full_path.exists():
                files_found += 1
                # Write delimiter and file path
                outfile.write(f"\n=== {file_path} ===\n")
                
                try:
                    with open(full_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        outfile.write("```\n")
                        outfile.write(content)
                        outfile.write("\n```\n")
                        print(f"✓ Extracted: {file_path}")
                except Exception as e:
                    outfile.write(f"ERROR: Could not read file - {str(e)}\n")
                    print(f"✗ Error reading: {file_path} - {str(e)}")
            else:
                files_missing += 1
                outfile.write(f"\n=== {file_path} ===\n")
                outfile.write("FILE NOT FOUND\n")
                print(f"✗ Not found: {file_path}")
        
        # Write summary
        outfile.write(f"\n\n=== EXTRACTION SUMMARY ===\n")
        outfile.write(f"Files found: {files_found}\n")
        outfile.write(f"Files missing: {files_missing}\n")
        outfile.write(f"Total files processed: {len(PERFORMANCE_FILES)}\n")
    
    print(f"\n✅ Extraction complete!")
    print(f"📄 Output file: {output_file}")
    print(f"📊 {files_found}/{len(PERFORMANCE_FILES)} files extracted successfully")
    
    return output_file

if __name__ == "__main__":
    extract_files()