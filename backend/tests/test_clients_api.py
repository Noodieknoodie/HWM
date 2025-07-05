# backend/tests/test_clients_api.py
import pytest
from unittest.mock import Mock


class TestClientsAPI:
    """Test suite for Clients API endpoints"""
    
    def test_get_clients_unauthenticated(self, client):
        """Test that unauthenticated requests are rejected"""
        response = client.get("/api/clients/")
        assert response.status_code == 401
        
    def test_get_clients_success(self, client, mock_auth, mock_db_connection, sample_client_data):
        """Test successful retrieval of all clients"""
        # Set up mock data
        mock_db_connection.fetchall.return_value = [sample_client_data]
        mock_db_connection.description = [(col,) for col in sample_client_data.keys()]
        
        response = client.get("/api/clients/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["ClientName"] == "Test Client"
        
    def test_get_clients_empty(self, client, mock_auth, mock_db_connection):
        """Test retrieval when no clients exist"""
        mock_db_connection.fetchall.return_value = []
        
        response = client.get("/api/clients/")
        assert response.status_code == 200
        assert response.json() == []
        
    def test_get_client_by_id_success(self, client, mock_auth, mock_db_connection, sample_client_data):
        """Test successful retrieval of a single client"""
        mock_db_connection.fetchone.return_value = sample_client_data
        mock_db_connection.description = [(col,) for col in sample_client_data.keys()]
        
        response = client.get("/api/clients/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ClientID"] == 1
        assert data["ClientName"] == "Test Client"
        
    def test_get_client_by_id_not_found(self, client, mock_auth, mock_db_connection):
        """Test retrieval of non-existent client"""
        mock_db_connection.fetchone.return_value = None
        
        response = client.get("/api/clients/999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        
    def test_create_client_success(self, client, mock_auth, mock_db_connection):
        """Test successful client creation"""
        new_client = {
            "ClientName": "New Client",
            "ClientType": "Small Business",
            "Address": "456 New St",
            "City": "New City",
            "State": "NC",
            "ZipCode": "54321",
            "Country": "USA",
            "ContactName": "New Contact",
            "ContactEmail": "new@client.com",
            "ContactPhone": "987-654-3210"
        }
        
        # Mock the INSERT returning the new ID
        mock_db_connection.fetchone.return_value = (2,)
        
        response = client.post("/api/clients/", json=new_client)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == 2
        assert data["message"] == "Client created successfully"
        
    def test_create_client_validation_error(self, client, mock_auth):
        """Test client creation with invalid data"""
        invalid_client = {
            "ClientName": "",  # Empty name should fail validation
            "ClientType": "Invalid Type"  # Invalid type
        }
        
        response = client.post("/api/clients/", json=invalid_client)
        assert response.status_code == 422  # Validation error
        
    def test_update_client_success(self, client, mock_auth, mock_db_connection):
        """Test successful client update"""
        update_data = {
            "ClientName": "Updated Client",
            "ContactEmail": "updated@client.com"
        }
        
        response = client.put("/api/clients/1", json=update_data)
        assert response.status_code == 200
        assert response.json()["message"] == "Client updated successfully"
        
    def test_delete_client_success(self, client, mock_auth, mock_db_connection):
        """Test successful client soft deletion"""
        response = client.delete("/api/clients/1")
        assert response.status_code == 200
        assert response.json()["message"] == "Client deleted successfully"
        
        # Verify the UPDATE query was called (soft delete)
        mock_db_connection.execute.assert_called()
        call_args = mock_db_connection.execute.call_args[0][0]
        assert "UPDATE" in call_args
        assert "IsDeleted = 1" in call_args