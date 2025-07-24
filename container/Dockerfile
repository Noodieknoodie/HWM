FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000

# Download and install Data API Builder
RUN apt-get update && apt-get install -y wget unzip
RUN wget https://github.com/Azure/data-api-builder/releases/download/v1.5.56/dab_net8.0_linux-x64-1.5.56.zip -O /tmp/dab.zip
RUN unzip /tmp/dab.zip -d /app
RUN chmod +x /app/Microsoft.DataApiBuilder

# Copy the configuration file
COPY dab-config.json /app/dab-config.json

# Set environment variable for the port
ENV ASPNETCORE_URLS=http://+:5000

# Set verbose logging
ENV DOTNET_Logging__LogLevel__Default=Debug

# Start Data API Builder
ENTRYPOINT ["/app/Microsoft.DataApiBuilder", "start", "-c", "/app/dab-config.json", "--no-https-redirect"]