#!/bin/bash

# Kill any existing processes
echo "Killing existing processes..."
pkill -f vite
pkill -f "swa start"
pkill -f Microsoft.DataApiBuilder
sleep 2

# Export connection string
export DATABASE_CONNECTION_STRING="Server=tcp:hohimerpro-db-server.database.windows.net,1433;Initial Catalog=HohimerPro-401k;User ID=local_dev_user;Password=Prunes27\$\$\$\$;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

# Backup and swap configs
cd swa-db-connections
[ ! -f "staticwebapp.database.config.prod.json" ] && cp staticwebapp.database.config.json staticwebapp.database.config.prod.json
cp staticwebapp.database.config.local.json staticwebapp.database.config.json
cd ..

# Start everything with proper order
echo "Starting development servers..."
npx concurrently --kill-others \
  "npx vite --host --port 5173" \
  "sleep 5 && npx swa start http://localhost:5173 --data-api-location ./swa-db-connections --swa-config-location ./staticwebapp.config.local.json --port 4280 --verbose"