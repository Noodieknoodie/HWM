# backend/tests/test_dashboard_api.py
import pytest
from datetime import datetime, date
from decimal import Decimal


class TestDashboardAPI:
    """Test suite for Dashboard API endpoints"""
    
    def test_get_dashboard_success(self, client, mock_auth, mock_db_connection):
        """Test successful dashboard data retrieval"""
        # Mock client data
        client_data = {
            "ClientID": 1,
            "ClientName": "Test Client",
            "ClientType": "Enterprise",
            "IsActive": True,
            "TotalContracts": 3,
            "ActiveContracts": 2,
            "CreatedAt": datetime(2024, 1, 1).isoformat()
        }
        
        # Mock metrics data
        metrics_data = {
            "TotalRevenue": Decimal("150000.00"),
            "TotalExpectedRevenue": Decimal("160000.00"),
            "TotalVariance": Decimal("-10000.00"),
            "VariancePercentage": Decimal("-6.25"),
            "LastPaymentDate": date(2024, 3, 15).isoformat(),
            "PaymentsLast30Days": 2,
            "AvgPaymentAmount": Decimal("12500.00")
        }
        
        # Mock quarterly data
        quarterly_data = [
            {
                "Quarter": 1,
                "Year": 2024,
                "Revenue": Decimal("45000.00"),
                "ExpectedRevenue": Decimal("48000.00"),
                "Variance": Decimal("-3000.00"),
                "PaymentCount": 9
            },
            {
                "Quarter": 2,
                "Year": 2024,
                "Revenue": Decimal("50000.00"),
                "ExpectedRevenue": Decimal("52000.00"),
                "Variance": Decimal("-2000.00"),
                "PaymentCount": 10
            }
        ]
        
        # Set up mock returns
        mock_db_connection.fetchone.side_effect = [client_data, metrics_data]
        mock_db_connection.fetchall.return_value = quarterly_data
        mock_db_connection.description = [(col,) for col in client_data.keys()]
        
        response = client.get("/api/dashboard/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["client"]["ClientName"] == "Test Client"
        assert data["metrics"]["TotalRevenue"] == 150000.00
        assert data["metrics"]["VariancePercentage"] == -6.25
        assert len(data["quarterlyTrends"]) == 2
        assert data["quarterlyTrends"][0]["Quarter"] == 1
        
    def test_get_dashboard_client_not_found(self, client, mock_auth, mock_db_connection):
        """Test dashboard for non-existent client"""
        mock_db_connection.fetchone.return_value = None
        
        response = client.get("/api/dashboard/999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        
    def test_get_dashboard_no_metrics(self, client, mock_auth, mock_db_connection):
        """Test dashboard when client has no payment metrics"""
        client_data = {
            "ClientID": 1,
            "ClientName": "New Client",
            "ClientType": "Small Business",
            "IsActive": True,
            "TotalContracts": 0,
            "ActiveContracts": 0,
            "CreatedAt": datetime.now().isoformat()
        }
        
        # No metrics data
        mock_db_connection.fetchone.side_effect = [client_data, None]
        mock_db_connection.fetchall.return_value = []
        mock_db_connection.description = [(col,) for col in client_data.keys()]
        
        response = client.get("/api/dashboard/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["client"]["ClientName"] == "New Client"
        # Metrics should have default values
        assert data["metrics"]["TotalRevenue"] == 0
        assert data["metrics"]["TotalExpectedRevenue"] == 0
        assert len(data["quarterlyTrends"]) == 0
        
    def test_get_dashboard_unauthenticated(self, client):
        """Test dashboard access without authentication"""
        response = client.get("/api/dashboard/1")
        assert response.status_code == 401
        
    def test_get_dashboard_invalid_client_id(self, client, mock_auth):
        """Test dashboard with invalid client ID format"""
        response = client.get("/api/dashboard/invalid")
        assert response.status_code == 422  # Validation error for non-integer ID
        
    def test_get_dashboard_compliance_status(self, client, mock_auth, mock_db_connection):
        """Test dashboard compliance status calculation"""
        client_data = {
            "ClientID": 1,
            "ClientName": "Test Client",
            "ClientType": "Enterprise",
            "IsActive": True,
            "TotalContracts": 2,
            "ActiveContracts": 2,
            "CreatedAt": datetime(2024, 1, 1).isoformat()
        }
        
        # Metrics with positive variance (good compliance)
        metrics_data = {
            "TotalRevenue": Decimal("160000.00"),
            "TotalExpectedRevenue": Decimal("150000.00"),
            "TotalVariance": Decimal("10000.00"),
            "VariancePercentage": Decimal("6.67"),
            "LastPaymentDate": date.today().isoformat(),
            "PaymentsLast30Days": 5,
            "AvgPaymentAmount": Decimal("15000.00")
        }
        
        mock_db_connection.fetchone.side_effect = [client_data, metrics_data]
        mock_db_connection.fetchall.return_value = []
        mock_db_connection.description = [(col,) for col in client_data.keys()]
        
        response = client.get("/api/dashboard/1")
        assert response.status_code == 200
        
        data = response.json()
        # With positive variance, compliance should be good
        assert data["metrics"]["VariancePercentage"] > 0