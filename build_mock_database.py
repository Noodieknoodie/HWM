#!/usr/bin/env python3
"""
Build mock database JSON by running queries via MCP
Since direct pyodbc connection isn't working, this script will output
all the SQL queries you need to run via the MCP tool.
"""

import json
import os
from datetime import datetime

# Create output directory
os.makedirs("public/mock-data", exist_ok=True)

# Initialize the structure
mock_db = {
    "metadata": {
        "exported_at": datetime.now().isoformat(),
        "version": "1.0",
        "description": "Sanitized mock database for demo/testing"
    },
    "tables": {},
    "views": {}
}

print("""
MOCK DATABASE BUILDER
=====================

Run these queries using the MCP SQL tool, then I'll compile them into the final JSON.

Step 1: First, let me gather the data using MCP...
""")

# I'll run the queries directly via MCP and build the JSON