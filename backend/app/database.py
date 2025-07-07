# backend/app/database.py
"""Database connection and session management for Azure SQL Database"""

import os
import pyodbc  # type: ignore
import struct
from contextlib import contextmanager
from typing import Generator
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
        
    def get_connection(self) -> pyodbc.Connection:
        """Create and return a new database connection using Azure AD token"""
        # Get access token for Azure SQL Database
        token = self.credential.get_token("https://database.windows.net/.default").token
        
        # Convert token to bytes for pyodbc
        token_bytes = token.encode("UTF-16-LE")
        token_struct = struct.pack(f'<I{len(token_bytes)}s', len(token_bytes), token_bytes)
        
        # Connect using token
        SQL_COPT_SS_ACCESS_TOKEN = 1256
        conn = pyodbc.connect(self.connection_string, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct})
        
        return conn
    
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