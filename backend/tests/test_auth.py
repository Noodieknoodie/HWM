# backend/tests/test_auth.py
import pytest
from unittest.mock import Mock, patch, MagicMock
from jose import jwt, JWTError
from datetime import datetime, timedelta
import json


class TestAuthentication:
    """Test suite for authentication functionality"""
    
    @patch('app.auth.httpx.get')
    def test_get_jwks_success(self, mock_get):
        """Test successful JWKS retrieval"""
        from app.auth import get_jwks
        
        # Mock JWKS response
        mock_jwks = {
            "keys": [
                {
                    "kty": "RSA",
                    "use": "sig",
                    "kid": "test-key-id",
                    "n": "test-modulus",
                    "e": "AQAB"
                }
            ]
        }
        
        mock_response = Mock()
        mock_response.json.return_value = mock_jwks
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        tenant_id = "test-tenant"
        result = get_jwks(tenant_id)
        
        assert result == mock_jwks
        mock_get.assert_called_once()
        assert f"{tenant_id}/discovery/v2.0/keys" in mock_get.call_args[0][0]
        
    @patch('app.auth.httpx.get')
    def test_get_jwks_failure(self, mock_get):
        """Test JWKS retrieval failure"""
        from app.auth import get_jwks
        
        mock_get.side_effect = Exception("Network error")
        
        tenant_id = "test-tenant"
        result = get_jwks(tenant_id)
        
        assert result is None
        
    def test_validate_token_success(self):
        """Test successful token validation"""
        from app.auth import validate_token
        
        # Create a mock token
        test_payload = {
            "aud": "test-audience",
            "iss": "https://login.microsoftonline.com/test-tenant/v2.0",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "preferred_username": "test@example.com"
        }
        
        # Mock JWT decode
        with patch('app.auth.jwt.decode') as mock_decode:
            mock_decode.return_value = test_payload
            
            with patch('app.auth.get_jwks') as mock_get_jwks:
                mock_get_jwks.return_value = {"keys": [{"kid": "test-key"}]}
                
                result = validate_token("fake-token", "test-tenant", "test-audience")
                
                assert result == test_payload
                mock_decode.assert_called_once()
                
    def test_validate_token_invalid_audience(self):
        """Test token validation with invalid audience"""
        from app.auth import validate_token
        
        test_payload = {
            "aud": "wrong-audience",
            "iss": "https://login.microsoftonline.com/test-tenant/v2.0",
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        
        with patch('app.auth.jwt.decode') as mock_decode:
            mock_decode.return_value = test_payload
            
            with patch('app.auth.get_jwks') as mock_get_jwks:
                mock_get_jwks.return_value = {"keys": [{"kid": "test-key"}]}
                
                result = validate_token("fake-token", "test-tenant", "test-audience")
                
                assert result is None
                
    def test_validate_token_expired(self):
        """Test validation of expired token"""
        from app.auth import validate_token
        
        with patch('app.auth.jwt.decode') as mock_decode:
            mock_decode.side_effect = JWTError("Token expired")
            
            with patch('app.auth.get_jwks') as mock_get_jwks:
                mock_get_jwks.return_value = {"keys": [{"kid": "test-key"}]}
                
                result = validate_token("expired-token", "test-tenant", "test-audience")
                
                assert result is None
                
    def test_get_current_user_success(self):
        """Test successful user extraction from request"""
        from app.auth import get_current_user
        from fastapi import HTTPException
        
        # Mock request with authorization header
        mock_request = Mock()
        mock_request.headers.get.return_value = "Bearer valid-token"
        
        # Mock environment variables
        with patch.dict('os.environ', {
            'AZURE_TENANT_ID': 'test-tenant',
            'AZURE_CLIENT_ID': 'test-client'
        }):
            with patch('app.auth.validate_token') as mock_validate:
                mock_validate.return_value = {
                    "preferred_username": "user@example.com"
                }
                
                result = get_current_user(mock_request)
                
                assert result == "user@example.com"
                mock_validate.assert_called_once_with(
                    "valid-token", "test-tenant", "test-client"
                )
                
    def test_get_current_user_no_token(self):
        """Test user extraction with missing token"""
        from app.auth import get_current_user
        from fastapi import HTTPException
        
        mock_request = Mock()
        mock_request.headers.get.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(mock_request)
            
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"
        
    def test_get_current_user_invalid_token(self):
        """Test user extraction with invalid token"""
        from app.auth import get_current_user
        from fastapi import HTTPException
        
        mock_request = Mock()
        mock_request.headers.get.return_value = "Bearer invalid-token"
        
        with patch.dict('os.environ', {
            'AZURE_TENANT_ID': 'test-tenant',
            'AZURE_CLIENT_ID': 'test-client'
        }):
            with patch('app.auth.validate_token') as mock_validate:
                mock_validate.return_value = None  # Invalid token
                
                with pytest.raises(HTTPException) as exc_info:
                    get_current_user(mock_request)
                    
                assert exc_info.value.status_code == 401
                assert exc_info.value.detail == "Invalid token"
                
    def test_token_caching(self):
        """Test that validated tokens are cached"""
        from app.auth import validate_token, _token_cache
        
        # Clear cache first
        _token_cache.clear()
        
        test_payload = {
            "aud": "test-audience",
            "iss": "https://login.microsoftonline.com/test-tenant/v2.0",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "preferred_username": "test@example.com"
        }
        
        with patch('app.auth.jwt.decode') as mock_decode:
            mock_decode.return_value = test_payload
            
            with patch('app.auth.get_jwks') as mock_get_jwks:
                mock_get_jwks.return_value = {"keys": [{"kid": "test-key"}]}
                
                # First call
                result1 = validate_token("test-token", "test-tenant", "test-audience")
                assert result1 == test_payload
                
                # Second call should use cache
                result2 = validate_token("test-token", "test-tenant", "test-audience")
                assert result2 == test_payload
                
                # JWT decode should only be called once due to caching
                assert mock_decode.call_count == 1