FROM mcr.microsoft.com/azure-databases/data-api-builder
COPY swa-db-connections/staticwebapp.database.containerapp.json /App/dab-config.json
