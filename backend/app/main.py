# backend/app/main.py
"""Main FastAPI application for HWM 401k Payment Tracker"""

import os
from dotenv import load_dotenv  # type: ignore
from fastapi import FastAPI, HTTPException  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

from app.database import db, create_error_response


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        # Test database connection
        with db.get_cursor() as cursor:
            cursor.execute("SELECT 1")
            print("✓ Database connection successful")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        raise
    
    yield
    
    # Shutdown
    print("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="HWM 401k Payment Tracker API",
    description="API for managing 401k payment tracking for Hohimer Wealth Management",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,https://teams.microsoft.com").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            code=f"HTTP_{exc.status_code}",
            message=exc.detail
        )
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    # Log the error (in production, use proper logging)
    print(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=create_error_response(
            code="INTERNAL_ERROR",
            message="An internal server error occurred"
        )
    )


# Root endpoint (public)
@app.get("/")
async def root():
    return {
        "message": "HWM 401k Payment Tracker API",
        "version": "1.0.0",
        "status": "operational",
        "authentication": "Azure AD JWT required for API endpoints"
    }


# Auth configuration endpoint (public)
@app.get("/auth/config")
async def auth_config():
    """Get authentication configuration for frontend"""
    tenant_id = os.getenv("AZURE_TENANT_ID")
    client_id = os.getenv("AZURE_CLIENT_ID")
    
    if not tenant_id or not client_id:
        return JSONResponse(
            status_code=503,
            content=create_error_response(
                code="AUTH_NOT_CONFIGURED",
                message="Authentication configuration missing"
            )
        )
    
    return {
        "authority": f"https://login.microsoftonline.com/{tenant_id}",
        "clientId": client_id,
        "redirectUri": os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "scopes": [f"api://{client_id}/.default"]
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        with db.get_cursor() as cursor:
            cursor.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content=create_error_response(
                code="DATABASE_ERROR",
                message=f"Database connection failed: {str(e)}"
            )
        )


# API routes will be added here via routers
# For now, creating the structure for Sprint 2+
from app.api import clients, contracts, payments, periods, dashboard

app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(periods.router, prefix="/api/periods", tags=["periods"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])