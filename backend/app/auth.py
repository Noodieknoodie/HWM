# backend/app/auth.py
"""Azure Static Web Apps authentication for the backend"""

import os
import json
import base64
from typing import Optional
from fastapi import HTTPException, Request # type: ignore
from pydantic import BaseModel # type: ignore


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
    """Extract user from Static Web Apps headers"""
    
    # DEBUG: Log every auth attempt
    print("\n🔍 AUTH REQUEST:")
    print(f"   Path: {request.url.path}")
    print(f"   Method: {request.method}")
    print(f"   Headers: {dict(request.headers)}")
    print(f"   Environment: {os.getenv('ENVIRONMENT', 'not set')}")
    
    # Development mode - bypass auth
    if os.getenv("ENVIRONMENT", "development") == "development":
        print("   ✅ Development mode - bypassing auth")
        dev_user = request.headers.get("X-Dev-User", "dev@localhost")
        return TokenUser(
            user_id="dev-" + dev_user.split("@")[0],
            email=dev_user,
            name=dev_user.split("@")[0].title(),
            tenant_id="development",
            roles=["authenticated", "developer"]
        )
    
    print("   ❌ Production mode - checking for auth header")
    
    # Production mode - require real auth
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