# backend/app/database.py
"""Database connection and session management for Azure SQL Database"""

import os
import pyodbc  # type: ignore
import struct
import time
from datetime import datetime, timedelta
from contextlib import contextmanager
from typing import Generator, Optional
from azure.identity import DefaultAzureCredential, AzureCliCredential  # type: ignore

# Get connection string from environment (without Authentication parameter)
CONNECTION_STRING = os.getenv(
    "AZURE_SQL_CONNECTION_STRING",
    "Driver={ODBC Driver 18 for SQL Server};Server=tcp:hohimerpro-db-server.database.windows.net,1433;Database=HohimerPro-401k;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
)


class Database:
    """Database connection manager for Azure SQL with passwordless authentication"""
    
    def __init__(self):
        self.connection_string = CONNECTION_STRING
        # Use AzureCliCredential for local dev, DefaultAzureCredential for production
        if os.getenv("ENVIRONMENT", "development") == "development":
            self.credential = AzureCliCredential()
        else:
            self.credential = DefaultAzureCredential(exclude_interactive_browser_credential=True)
        
        # Token caching
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
        
        # Retry configuration
        self._max_retries = 3
        self._retry_delay = 1  # seconds
        
    def _get_token(self) -> str:
        """Get Azure AD token with caching"""
        # Check if we have a valid cached token
        if self._token and self._token_expiry and datetime.utcnow() < self._token_expiry:
            return self._token
        
        # Get new token
        token_response = self.credential.get_token("https://database.windows.net/.default")
        self._token = token_response.token
        # Token typically expires in 1 hour, we'll refresh after 50 minutes to be safe
        self._token_expiry = datetime.utcnow() + timedelta(minutes=50)
        
        return self._token
        
    def get_connection(self) -> pyodbc.Connection:
        """Create and return a new database connection using Azure AD token with retry logic"""
        last_error = None
        
        for attempt in range(self._max_retries):
            try:
                # Get access token (cached if possible)
                token = self._get_token()
                
                # Convert token to bytes for pyodbc
                token_bytes = token.encode("UTF-16-LE")
                token_struct = struct.pack(f'<I{len(token_bytes)}s', len(token_bytes), token_bytes)
                
                # Connect using token
                SQL_COPT_SS_ACCESS_TOKEN = 1256
                conn = pyodbc.connect(self.connection_string, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct})
                
                return conn
                
            except Exception as e:
                last_error = e
                # Check if it's a transient error worth retrying
                error_str = str(e).lower()
                if any(phrase in error_str for phrase in ['timeout', 'connection', 'network', 'temporary']):
                    if attempt < self._max_retries - 1:
                        time.sleep(self._retry_delay * (attempt + 1))  # Exponential backoff
                        continue
                # Non-transient error or last attempt
                break
        
        # If we get here, all retries failed
        raise last_error or Exception("Failed to connect to database")
    
    @contextmanager
    def get_cursor(self) -> Generator[pyodbc.Cursor, None, None]:
        """Context manager for database cursor with automatic cleanup"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()


# Global database instance
db = Database()


# Helper function for standardized error responses
def create_error_response(code: str, message: str) -> dict:
    """Create standardized error response format"""
    return {
        "error": {
            "code": code,
            "message": message
        }
    }