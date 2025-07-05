# backend/run_tests.py
#!/usr/bin/env python
"""Script to run backend tests with proper configuration"""

import os
import sys
import subprocess

def main():
    """Run pytest with appropriate settings"""
    # Set environment variables for testing
    os.environ['AZURE_TENANT_ID'] = 'test-tenant-id'
    os.environ['AZURE_CLIENT_ID'] = 'test-client-id'
    os.environ['AZURE_SQL_CONNECTION_STRING'] = 'test-connection-string'
    
    # Run pytest
    result = subprocess.run([
        sys.executable, '-m', 'pytest',
        '--tb=short',
        '-v'
    ])
    
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())