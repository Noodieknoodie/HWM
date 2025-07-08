#!/bin/bash
# launch-dev.sh

echo "🚀 Starting HWM Development Server..."

# Start Vite in background
echo "📦 Starting Vite..."
npm run dev &
VITE_PID=$!

# Wait for Vite to be ready
echo "⏳ Waiting for Vite..."
sleep 3

# Start SWA CLI
echo "☁️  Starting Azure SWA CLI..."
swa start http://localhost:5173 --data-api-location swa-db-connections

# Kill Vite when SWA exits
kill $VITE_PID