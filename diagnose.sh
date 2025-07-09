#!/bin/bash
# /mnt/c/Users/erikl/TeamsApps/HWM/diagnose.sh

echo "=== SWA Development Diagnostics ==="
echo ""

# 1. Check ports
echo "1. Checking ports..."
echo "Port 4280 (SWA):"
netstat -an | grep 4280 || echo "  - NOT LISTENING"
echo "Port 5173 (Vite):"
netstat -an | grep 5173 || echo "  - NOT LISTENING"
echo "Port 5000 (Data API):"
netstat -an | grep 5000 || echo "  - NOT LISTENING"
echo ""

# 2. Check processes
echo "2. Checking processes..."
ps aux | grep -E "swa|vite|node" | grep -v grep || echo "  - No SWA/Vite processes found"
echo ""

# 3. Check environment
echo "3. Checking environment..."
echo "DATABASE_CONNECTION_STRING: ${DATABASE_CONNECTION_STRING:0:20}..." || echo "  - NOT SET"
echo ""

# 4. Test Vite directly
echo "4. Testing Vite directly..."
curl -s http://localhost:5173 > /dev/null && echo "  - Vite is accessible" || echo "  - Vite NOT accessible"
echo ""

# 5. Test SWA
echo "5. Testing SWA..."
curl -s http://localhost:4280 > /dev/null && echo "  - SWA is accessible" || echo "  - SWA NOT accessible"
echo ""

# 6. Check SWA installation
echo "6. Checking SWA CLI..."
which swa && swa --version || echo "  - SWA CLI not found"
echo ""

# 7. Quick fix attempt
echo "7. Quick fix suggestions:"
echo "  a) Kill all processes: pkill -f 'swa|vite'"
echo "  b) Source .env: source .env"
echo "  c) Run: swa start hwm --verbose"
echo ""

echo "=== End Diagnostics ==="