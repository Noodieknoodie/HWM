#!/usr/bin/env python3
# db_query.py - Quick Azure SQL Database query tool

import pyodbc
import sys
from azure.identity import DefaultAzureCredential

# Database connection details
server = 'hohimerpro-db-server.database.windows.net'
database = 'HohimerPro-401k'

# Connection string using Azure AD authentication
connection_string = f'Driver={{ODBC Driver 18 for SQL Server}};Server={server};Database={database};Authentication=ActiveDirectoryDefault;'

def query_db(query):
    """Execute a query and return results"""
    try:
        with pyodbc.connect(connection_string) as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            
            # Fetch column names
            columns = [column[0] for column in cursor.description]
            
            # Fetch all rows
            rows = cursor.fetchall()
            
            # Print results
            print(" | ".join(columns))
            print("-" * 80)
            for row in rows:
                print(" | ".join(str(value) for value in row))
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        # Default query to list tables
        query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
    
    print(f"Executing: {query}\n")
    query_db(query)