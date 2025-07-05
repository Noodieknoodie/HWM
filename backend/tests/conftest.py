# backend/tests/conftest.py
import os
import sys
from unittest.mock import Mock, patch
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from azure.identity import DefaultAzureCredential

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from app.auth import get_current_user


@pytest.fixture
def client() -> Generator:
    """Create a test client for the FastAPI app"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_auth():
    """Mock authentication for testing protected endpoints"""
    def mock_get_current_user():
        return "test_user@example.com"
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def mock_db_connection():
    """Mock database connection for testing"""
    with patch('app.database.pyodbc.connect') as mock_connect:
        # Create mock connection and cursor
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn
        
        # Default behavior for fetchall and fetchone
        mock_cursor.fetchall.return_value = []
        mock_cursor.fetchone.return_value = None
        
        yield mock_cursor
        
        
@pytest.fixture
def mock_azure_credential():
    """Mock Azure credential for testing"""
    with patch('app.auth.DefaultAzureCredential') as mock_cred:
        mock_instance = Mock(spec=DefaultAzureCredential)
        mock_cred.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def sample_client_data():
    """Sample client data for testing"""
    return {
        "ClientID": 1,
        "ClientName": "Test Client",
        "ClientType": "Enterprise",
        "IsActive": True,
        "Address": "123 Test St",
        "City": "Test City",
        "State": "TS",
        "ZipCode": "12345",
        "Country": "Test Country",
        "ContactName": "Test Contact",
        "ContactEmail": "contact@test.com",
        "ContactPhone": "123-456-7890",
        "Notes": "Test notes",
        "CreatedAt": "2024-01-01T00:00:00",
        "LastActiveDate": "2024-01-01T00:00:00"
    }


@pytest.fixture
def sample_contract_data():
    """Sample contract data for testing"""
    return {
        "ContractID": 1,
        "ClientID": 1,
        "ContractName": "Test Contract",
        "ContractType": "Fixed",
        "StartDate": "2024-01-01",
        "EndDate": "2024-12-31",
        "BaseAmount": 10000.00,
        "PaymentFrequency": "Monthly",
        "FeeType": "Percentage",
        "FeeAmount": 2.5,
        "Notes": "Test contract notes",
        "IsActive": True
    }


@pytest.fixture
def sample_payment_data():
    """Sample payment data for testing"""
    return {
        "PaymentID": 1,
        "ContractID": 1,
        "PaymentDate": "2024-01-15",
        "PeriodStart": "2024-01-01",
        "PeriodEnd": "2024-01-31",
        "Amount": 10000.00,
        "Status": "Paid",
        "PaymentMethod": "ACH",
        "TransactionReference": "TX123456",
        "Notes": "Test payment",
        "CreatedBy": "test_user@example.com",
        "CreatedAt": "2024-01-15T10:00:00"
    }