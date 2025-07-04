# backend/app/auth.py
"""Azure AD authentication middleware for JWT validation"""

import os
import json
import requests
from typing import Optional, Dict, Any
from functools import lru_cache
from datetime import datetime, timezone

from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from pydantic import BaseModel

from app.database import create_error_response


class TokenUser(BaseModel):
    """Authenticated user information from JWT token"""
    user_id: str
    email: str
    name: str
    tenant_id: str
    roles: list[str] = []
    
    @property
    def is_authenticated(self) -> bool:
        return bool(self.user_id)


# Security scheme for FastAPI docs
security = HTTPBearer()


# Cache for Azure AD public keys
@lru_cache(maxsize=1)
def get_azure_ad_keys(tenant_id: str) -> Dict[str, Any]:
    """Fetch Azure AD public keys for token validation"""
    # Microsoft's well-known endpoint for public keys
    jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    
    try:
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Failed to fetch Azure AD keys: {e}")
        raise HTTPException(
            status_code=503,
            detail="Failed to fetch authentication keys"
        )


def decode_token(token: str, tenant_id: str, audience: str) -> Dict[str, Any]:
    """Decode and validate Azure AD JWT token"""
    # Get the key ID from token header
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise ValueError("Token missing key ID")
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token format"
        )
    
    # Get Azure AD public keys
    jwks = get_azure_ad_keys(tenant_id)
    
    # Find the right key
    rsa_key = None
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            rsa_key = key
            break
    
    if not rsa_key:
        raise HTTPException(
            status_code=401,
            detail="Token signing key not found"
        )
    
    # Validate and decode token
    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=audience,
            issuer=f"https://login.microsoftonline.com/{tenant_id}/v2.0",
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
                "verify_nbf": True,
                "require_exp": True,
                "require_iat": True,
                "require_nbf": True
            }
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token validation failed: {str(e)}"
        )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenUser:
    """Extract and validate user from request token"""
    # Get configuration from environment
    tenant_id = os.getenv("AZURE_TENANT_ID")
    client_id = os.getenv("AZURE_CLIENT_ID")
    
    if not tenant_id or not client_id:
        raise HTTPException(
            status_code=500,
            detail="Authentication not configured"
        )
    
    # Decode and validate token
    try:
        payload = decode_token(
            token=credentials.credentials,
            tenant_id=tenant_id,
            audience=client_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )
    
    # Extract user information
    user = TokenUser(
        user_id=payload.get("oid", payload.get("sub", "")),
        email=payload.get("preferred_username", payload.get("email", "")),
        name=payload.get("name", ""),
        tenant_id=payload.get("tid", ""),
        roles=payload.get("roles", [])
    )
    
    if not user.user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid user information in token"
        )
    
    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[TokenUser]:
    """Get user if authenticated, otherwise return None"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


# Dependency for protected endpoints
async def require_auth(user: TokenUser = Depends(get_current_user)) -> TokenUser:
    """Require authenticated user for endpoint access"""
    if not user.is_authenticated:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    return user