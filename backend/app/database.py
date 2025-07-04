# backend/app/database.py
"""Database connection and session management for Azure SQL Database"""

import os
import pyodbc
from contextlib import contextmanager
from typing import Generator

# Get connection string from environment
CONNECTION_STRING = os.getenv(
    "AZURE_SQL_CONNECTION_STRING",
    "Driver={ODBC Driver 18 for SQL Server};Server=tcp:hohimerpro-db-server.database.windows.net,1433;Database=HohimerPro-401k;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;Authentication=ActiveDirectoryDefault;"
)


class Database:
    """Database connection manager for Azure SQL"""
    
    def __init__(self):
        self.connection_string = CONNECTION_STRING
        
    def get_connection(self) -> pyodbc.Connection:
        """Create and return a new database connection"""
        return pyodbc.connect(self.connection_string)
    
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