# backend/tests/test_payments_api.py
import pytest
from datetime import datetime


class TestPaymentsAPI:
    """Test suite for Payments API endpoints"""
    
    def test_get_payments_success(self, client, mock_auth, mock_db_connection, sample_payment_data):
        """Test successful retrieval of all payments"""
        # Add variance calculation fields
        payment_with_variance = {**sample_payment_data}
        payment_with_variance.update({
            "ExpectedAmount": 10250.00,
            "PaymentVariance": -250.00,
            "VariancePercentage": -2.44
        })
        
        mock_db_connection.fetchall.return_value = [payment_with_variance]
        mock_db_connection.description = [(col,) for col in payment_with_variance.keys()]
        
        response = client.get("/api/payments/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["Amount"] == 10000.00
        assert data[0]["PaymentVariance"] == -250.00
        
    def test_get_payments_by_contract(self, client, mock_auth, mock_db_connection, sample_payment_data):
        """Test retrieval of payments filtered by contract ID"""
        mock_db_connection.fetchall.return_value = [sample_payment_data]
        mock_db_connection.description = [(col,) for col in sample_payment_data.keys()]
        
        response = client.get("/api/payments/?contract_id=1")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["ContractID"] == 1
        
    def test_get_payment_by_id_success(self, client, mock_auth, mock_db_connection, sample_payment_data):
        """Test successful retrieval of a single payment"""
        mock_db_connection.fetchone.return_value = sample_payment_data
        mock_db_connection.description = [(col,) for col in sample_payment_data.keys()]
        
        response = client.get("/api/payments/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["PaymentID"] == 1
        assert data["Amount"] == 10000.00
        
    def test_get_payment_not_found(self, client, mock_auth, mock_db_connection):
        """Test retrieval of non-existent payment"""
        mock_db_connection.fetchone.return_value = None
        
        response = client.get("/api/payments/999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        
    def test_create_payment_success(self, client, mock_auth, mock_db_connection):
        """Test successful payment creation"""
        new_payment = {
            "ContractID": 1,
            "PaymentDate": "2024-02-15",
            "PeriodStart": "2024-02-01",
            "PeriodEnd": "2024-02-29",
            "Amount": 10250.00,
            "Status": "Paid",
            "PaymentMethod": "Wire",
            "TransactionReference": "WIRE789",
            "Notes": "February payment"
        }
        
        mock_db_connection.fetchone.return_value = (2,)
        
        response = client.post("/api/payments/", json=new_payment)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == 2
        assert data["message"] == "Payment created successfully"
        
        # Verify CreatedBy was set from auth
        execute_call = mock_db_connection.execute.call_args[0][0]
        assert "test_user@example.com" in execute_call
        
    def test_create_payment_invalid_dates(self, client, mock_auth):
        """Test payment creation with period end before start"""
        invalid_payment = {
            "ContractID": 1,
            "PaymentDate": "2024-02-15",
            "PeriodStart": "2024-02-29",
            "PeriodEnd": "2024-02-01",  # End before start
            "Amount": 10000.00,
            "Status": "Paid"
        }
        
        response = client.post("/api/payments/", json=invalid_payment)
        assert response.status_code == 422  # Validation error
        
    def test_create_payment_negative_amount(self, client, mock_auth):
        """Test payment creation with negative amount"""
        invalid_payment = {
            "ContractID": 1,
            "PaymentDate": "2024-02-15",
            "PeriodStart": "2024-02-01",
            "PeriodEnd": "2024-02-29",
            "Amount": -1000.00,  # Negative amount
            "Status": "Paid"
        }
        
        response = client.post("/api/payments/", json=invalid_payment)
        assert response.status_code == 422  # Validation error
        
    def test_update_payment_success(self, client, mock_auth, mock_db_connection):
        """Test successful payment update"""
        update_data = {
            "Amount": 10500.00,
            "Status": "Reconciled",
            "Notes": "Updated after reconciliation"
        }
        
        response = client.put("/api/payments/1", json=update_data)
        assert response.status_code == 200
        assert response.json()["message"] == "Payment updated successfully"
        
    def test_delete_payment_success(self, client, mock_auth, mock_db_connection):
        """Test successful payment deletion"""
        response = client.delete("/api/payments/1")
        assert response.status_code == 200
        assert response.json()["message"] == "Payment deleted successfully"
        
        # Verify DELETE query was executed
        mock_db_connection.execute.assert_called()
        call_args = mock_db_connection.execute.call_args[0][0]
        assert "DELETE FROM Payments" in call_args