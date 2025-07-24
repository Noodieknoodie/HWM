# Azure Container App Deployment for Teams DAB

This guide walks through deploying the Data API Builder container for Teams authentication.

## Prerequisites
- Azure CLI installed
- Docker installed (for local testing)
- Azure Container Registry (ACR) created
- Azure Container Apps Environment created

## Step 1: Build and Push Container Image

```bash
# Variables
ACR_NAME="<your-acr-name>"
RESOURCE_GROUP="<your-resource-group>"
IMAGE_NAME="dab-teams"

# Login to Azure and ACR
az login
az acr login --name $ACR_NAME

# Build and push the image
cd container
docker build -t $ACR_NAME.azurecr.io/$IMAGE_NAME:latest .
docker push $ACR_NAME.azurecr.io/$IMAGE_NAME:latest
```

## Step 2: Create Container App

```bash
# Variables
CONTAINER_APP_NAME="dab-teams"
ENVIRONMENT_NAME="<your-container-apps-environment>"
DB_CONNECTION_STRING="<your-connection-string>"

# Create the container app
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_NAME.azurecr.io/$IMAGE_NAME:latest \
  --target-port 5000 \
  --ingress 'external' \
  --registry-server $ACR_NAME.azurecr.io \
  --query properties.configuration.ingress.fqdn
```

## Step 3: Set Environment Variables

```bash
# Set the database connection string
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "DATABASE_CONNECTION_STRING=secretref:db-connection"

# Add the secret
az containerapp secret set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets db-connection="$DB_CONNECTION_STRING"
```

## Step 4: Update React App Configuration

1. Get the Container App URL from the output of Step 2
2. Set it in your Static Web App configuration:

```bash
az staticwebapp appsettings set \
  --name <your-swa-name> \
  --setting-names VITE_TEAMS_DAB_URL=https://<container-app-fqdn>
```

## Step 5: Verify Teams Authentication

1. Open your app in Microsoft Teams
2. Check browser console for the container URL being used
3. Verify API calls return 200 OK with JSON responses

## Troubleshooting

### 401 Errors
- Verify the JWT issuer and audience in container/dab-config.json match your Teams app registration
- Check the Bearer token is being sent in the Authorization header
- Ensure the token hasn't expired

### Connection Issues
- Verify the Container App is accessible from Teams
- Check CORS settings in dab-config.json
- Ensure firewall rules allow traffic from Teams

### Database Connection
- Verify the connection string secret is set correctly
- Check the Container App has network access to the SQL database
- Test with Azure Data Studio using the same connection string

## Security Best Practices

1. **Use Managed Identity** (optional but recommended):
   - Enable system-assigned managed identity on the Container App
   - Grant the identity access to your SQL database
   - Update connection string to use `Authentication=Active Directory Managed Identity`

2. **Restrict Network Access**:
   - Configure Container App ingress to allow traffic only from your Teams app
   - Use Azure Front Door or Application Gateway for additional security

3. **Monitor and Audit**:
   - Enable Application Insights on the Container App
   - Monitor failed authentication attempts
   - Set up alerts for suspicious activity