# backend/tests/test_models.py
import pytest
from datetime import date, datetime
from decimal import Decimal
from pydantic import ValidationError


class TestModels:
    """Test suite for Pydantic models"""
    
    def test_client_model_valid(self):
        """Test valid client model creation"""
        from app.models import Client
        
        client_data = {
            "ClientName": "Test Client",
            "ClientType": "Enterprise",
            "Address": "123 Test St",
            "City": "Test City",
            "State": "TS",
            "ZipCode": "12345",
            "Country": "USA",
            "ContactName": "John Doe",
            "ContactEmail": "john@test.com",
            "ContactPhone": "123-456-7890",
            "Notes": "Test notes"
        }
        
        client = Client(**client_data)
        assert client.ClientName == "Test Client"
        assert client.ClientType == "Enterprise"
        
    def test_client_model_invalid_type(self):
        """Test client model with invalid type"""
        from app.models import Client
        
        with pytest.raises(ValidationError) as exc_info:
            Client(
                ClientName="Test",
                ClientType="InvalidType",  # Not in allowed enum
                Address="123 Test",
                City="City",
                State="ST",
                ZipCode="12345",
                Country="USA"
            )
        
        errors = exc_info.value.errors()
        assert any(error['loc'] == ('ClientType',) for error in errors)
        
    def test_contract_model_percentage_validation(self):
        """Test contract model percentage fee validation"""
        from app.models import Contract
        
        # Valid percentage
        contract = Contract(
            ClientID=1,
            ContractName="Test Contract",
            ContractType="Fixed",
            StartDate=date(2024, 1, 1),
            EndDate=date(2024, 12, 31),
            BaseAmount=10000.00,
            PaymentFrequency="Monthly",
            FeeType="Percentage",
            FeeAmount=2.5
        )
        assert contract.FeeAmount == 2.5
        
        # Invalid percentage (> 100)
        with pytest.raises(ValidationError):
            Contract(
                ClientID=1,
                ContractName="Invalid Contract",
                ContractType="Fixed",
                StartDate=date(2024, 1, 1),
                EndDate=date(2024, 12, 31),
                BaseAmount=10000.00,
                PaymentFrequency="Monthly",
                FeeType="Percentage",
                FeeAmount=150.0  # > 100%
            )
            
    def test_contract_model_date_validation(self):
        """Test contract date validation"""
        from app.models import Contract
        
        # Invalid: end date before start date
        with pytest.raises(ValidationError) as exc_info:
            Contract(
                ClientID=1,
                ContractName="Invalid Dates",
                ContractType="Fixed",
                StartDate=date(2024, 12, 31),
                EndDate=date(2024, 1, 1),  # Before start
                BaseAmount=10000.00,
                PaymentFrequency="Monthly",
                FeeType="Flat",
                FeeAmount=100.00
            )
        
        errors = exc_info.value.errors()
        assert any("end date" in str(error).lower() for error in errors)
        
    def test_payment_model_valid(self):
        """Test valid payment model"""
        from app.models import Payment
        
        payment = Payment(
            ContractID=1,
            PaymentDate=date(2024, 1, 15),
            PeriodStart=date(2024, 1, 1),
            PeriodEnd=date(2024, 1, 31),
            Amount=10000.00,
            Status="Paid",
            PaymentMethod="ACH",
            TransactionReference="TX123",
            Notes="Test payment"
        )
        
        assert payment.Amount == 10000.00
        assert payment.Status == "Paid"
        
    def test_payment_model_negative_amount(self):
        """Test payment with negative amount"""
        from app.models import Payment
        
        with pytest.raises(ValidationError):
            Payment(
                ContractID=1,
                PaymentDate=date(2024, 1, 15),
                PeriodStart=date(2024, 1, 1),
                PeriodEnd=date(2024, 1, 31),
                Amount=-100.00,  # Negative
                Status="Paid"
            )
            
    def test_payment_model_invalid_period(self):
        """Test payment with invalid period dates"""
        from app.models import Payment
        
        with pytest.raises(ValidationError):
            Payment(
                ContractID=1,
                PaymentDate=date(2024, 1, 15),
                PeriodStart=date(2024, 1, 31),
                PeriodEnd=date(2024, 1, 1),  # End before start
                Amount=1000.00,
                Status="Paid"
            )
            
    def test_dashboard_response_model(self):
        """Test complex dashboard response model"""
        from app.models import DashboardResponse, ClientInfo, PaymentMetrics, QuarterlyTrend
        
        dashboard_data = {
            "client": {
                "ClientID": 1,
                "ClientName": "Test Client",
                "ClientType": "Enterprise",
                "IsActive": True,
                "TotalContracts": 5,
                "ActiveContracts": 3,
                "CreatedAt": datetime.now()
            },
            "metrics": {
                "TotalRevenue": Decimal("150000.00"),
                "TotalExpectedRevenue": Decimal("160000.00"),
                "TotalVariance": Decimal("-10000.00"),
                "VariancePercentage": Decimal("-6.25"),
                "LastPaymentDate": date.today(),
                "PaymentsLast30Days": 10,
                "AvgPaymentAmount": Decimal("15000.00")
            },
            "quarterlyTrends": [
                {
                    "Quarter": 1,
                    "Year": 2024,
                    "Revenue": Decimal("45000.00"),
                    "ExpectedRevenue": Decimal("48000.00"),
                    "Variance": Decimal("-3000.00"),
                    "PaymentCount": 15
                }
            ]
        }
        
        response = DashboardResponse(**dashboard_data)
        assert response.client.ClientName == "Test Client"
        assert float(response.metrics.TotalRevenue) == 150000.00
        assert len(response.quarterlyTrends) == 1
        
    def test_client_with_status_model(self):
        """Test client model with calculated status fields"""
        from app.models import ClientWithStatus
        
        client_data = {
            "ClientID": 1,
            "ClientName": "Test Client",
            "ClientType": "Enterprise",
            "IsActive": True,
            "Address": "123 Test St",
            "City": "Test City",
            "State": "TS",
            "ZipCode": "12345",
            "Country": "USA",
            "TotalContracts": 5,
            "ActiveContracts": 3,
            "TotalRevenue": Decimal("50000.00"),
            "LastPaymentDate": date(2024, 3, 1),
            "CreatedAt": datetime(2024, 1, 1)
        }
        
        client = ClientWithStatus(**client_data)
        assert client.TotalContracts == 5
        assert client.ActiveContracts == 3
        assert float(client.TotalRevenue) == 50000.00