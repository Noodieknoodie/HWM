#!/bin/bash

# Kill any existing processes on these ports
echo "Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:4280 | xargs kill -9 2>/dev/null

# Kill background processes on script exit
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

# Export connection string for DAB
export DATABASE_CONNECTION_STRING="Server=tcp:hohimerpro-db-server.database.windows.net,1433;Initial Catalog=HohimerPro-401k;User ID=local_dev_user;Password=Prunes27\$\$\$\$;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

# Swap DAB config files for local development
cd swa-db-connections
if [ -f "staticwebapp.database.config.json" ] && [ -f "staticwebapp.database.config.local.json" ]; then
    # Backup production config if not already backed up
    if [ ! -f "staticwebapp.database.config.prod.json" ]; then
        cp staticwebapp.database.config.json staticwebapp.database.config.prod.json
    fi
    # Use local config with Simulator auth provider
    cp staticwebapp.database.config.local.json staticwebapp.database.config.json
fi
cd ..

# Start Vite first
echo "Starting Vite on port 5173..."
npx vite --host --port 5173 &
VITE_PID=$!

# Wait for Vite to be ready
echo "Waiting for Vite to start..."
sleep 5

# Start SWA CLI - it will start its own DAB instance
echo "Starting SWA CLI (which will start DAB automatically)..."
npx swa start http://localhost:5173 \
  --data-api-location ./swa-db-connections \
  --swa-config-location ./staticwebapp.config.local.json \
  --port 4280

# Restore original DAB config file on exit
cd swa-db-connections
if [ -f "staticwebapp.database.config.prod.json" ]; then
    cp staticwebapp.database.config.prod.json staticwebapp.database.config.json
fi
cd ..