# backend/tests/test_contracts_api.py
import pytest
from datetime import date


class TestContractsAPI:
    """Test suite for Contracts API endpoints"""
    
    def test_get_contracts_by_client_success(self, client, mock_auth, mock_db_connection, sample_contract_data):
        """Test successful retrieval of contracts for a client"""
        mock_db_connection.fetchall.return_value = [sample_contract_data]
        mock_db_connection.description = [(col,) for col in sample_contract_data.keys()]
        
        response = client.get("/api/contracts/?client_id=1")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["ContractName"] == "Test Contract"
        
    def test_get_contracts_missing_client_id(self, client, mock_auth):
        """Test contracts endpoint without client_id parameter"""
        response = client.get("/api/contracts/")
        assert response.status_code == 422  # Validation error for missing required param
        
    def test_create_contract_percentage_fee_success(self, client, mock_auth, mock_db_connection):
        """Test creating contract with percentage fee type"""
        new_contract = {
            "ClientID": 1,
            "ContractName": "New Contract",
            "ContractType": "Fixed",
            "StartDate": "2024-01-01",
            "EndDate": "2024-12-31",
            "BaseAmount": 50000.00,
            "PaymentFrequency": "Monthly",
            "FeeType": "Percentage",
            "FeeAmount": 2.5,
            "Notes": "Test contract"
        }
        
        mock_db_connection.fetchone.return_value = (2,)
        
        response = client.post("/api/contracts/", json=new_contract)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == 2
        assert data["message"] == "Contract created successfully"
        
    def test_create_contract_flat_fee_success(self, client, mock_auth, mock_db_connection):
        """Test creating contract with flat fee type"""
        new_contract = {
            "ClientID": 1,
            "ContractName": "Flat Fee Contract",
            "ContractType": "Variable",
            "StartDate": "2024-01-01",
            "EndDate": "2024-12-31",
            "BaseAmount": 0,  # Variable contracts might have 0 base
            "PaymentFrequency": "Quarterly",
            "FeeType": "Flat",
            "FeeAmount": 1000.00,
            "Notes": "Flat fee test"
        }
        
        mock_db_connection.fetchone.return_value = (3,)
        
        response = client.post("/api/contracts/", json=new_contract)
        assert response.status_code == 200
        
    def test_create_contract_invalid_percentage(self, client, mock_auth):
        """Test contract creation with invalid percentage (>100)"""
        invalid_contract = {
            "ClientID": 1,
            "ContractName": "Invalid Contract",
            "ContractType": "Fixed",
            "StartDate": "2024-01-01",
            "EndDate": "2024-12-31",
            "BaseAmount": 50000.00,
            "PaymentFrequency": "Monthly",
            "FeeType": "Percentage",
            "FeeAmount": 150.0,  # Invalid: > 100%
            "Notes": "Should fail"
        }
        
        response = client.post("/api/contracts/", json=invalid_contract)
        assert response.status_code == 400
        assert "percentage" in response.json()["detail"].lower()
        
    def test_create_contract_invalid_dates(self, client, mock_auth):
        """Test contract creation with end date before start date"""
        invalid_contract = {
            "ClientID": 1,
            "ContractName": "Invalid Date Contract",
            "ContractType": "Fixed",
            "StartDate": "2024-12-31",
            "EndDate": "2024-01-01",  # End before start
            "BaseAmount": 50000.00,
            "PaymentFrequency": "Monthly",
            "FeeType": "Flat",
            "FeeAmount": 1000.00
        }
        
        response = client.post("/api/contracts/", json=invalid_contract)
        assert response.status_code == 422  # Validation error
        
    def test_update_contract_success(self, client, mock_auth, mock_db_connection):
        """Test successful contract update"""
        update_data = {
            "ContractName": "Updated Contract",
            "BaseAmount": 75000.00,
            "FeeAmount": 3.0
        }
        
        response = client.put("/api/contracts/1", json=update_data)
        assert response.status_code == 200
        assert response.json()["message"] == "Contract updated successfully"
        
    def test_update_contract_not_found(self, client, mock_auth, mock_db_connection):
        """Test updating non-existent contract"""
        mock_db_connection.rowcount = 0  # Simulate no rows updated
        
        update_data = {"ContractName": "Updated"}
        response = client.put("/api/contracts/999", json=update_data)
        
        # Should still return 200 but with appropriate message
        assert response.status_code == 200