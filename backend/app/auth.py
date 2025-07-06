# backend/app/auth.py
"""Azure Static Web Apps authentication for the backend"""

import os
import json
import base64
from typing import Optional
from fastapi import HTTPException, Request, Depends
from pydantic import BaseModel


class TokenUser(BaseModel):
    """Authenticated user information from Static Web Apps"""
    user_id: str
    email: str
    name: str
    tenant_id: str = ""
    roles: list[str] = []
    
    @property
    def is_authenticated(self) -> bool:
        return bool(self.user_id)


async def get_current_user(request: Request) -> TokenUser:
    """Extract user from Static Web Apps headers or mock for development"""
    
    # In development, return a mock user
    if os.getenv("ENVIRONMENT", "development") == "development":
        return TokenUser(
            user_id="dev-user",
            email="developer@hohimerwealthmanagement.com",
            name="Developer",
            roles=["authenticated"]
        )
    
    # In production, Static Web Apps adds the X-MS-CLIENT-PRINCIPAL header
    principal_header = request.headers.get("X-MS-CLIENT-PRINCIPAL")
    
    if not principal_header:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    try:
        # Decode the base64 encoded principal
        principal_data = base64.b64decode(principal_header)
        principal = json.loads(principal_data)
        
        # Extract user information
        return TokenUser(
            user_id=principal.get("userId", ""),
            email=principal.get("userDetails", ""),
            name=principal.get("userDetails", "").split("@")[0],  # Use email prefix as name
            roles=principal.get("userRoles", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication data: {str(e)}"
        )


async def get_optional_user(request: Request) -> Optional[TokenUser]:
    """Get user if authenticated, otherwise return None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# Dependency for protected endpoints
async def require_auth(request: Request) -> TokenUser:
    """Require authenticated user for endpoint access"""
    user = await get_current_user(request)
    if not user.is_authenticated:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    return user