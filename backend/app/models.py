# backend/app/models.py
"""Pydantic models matching the Azure SQL database schema"""

from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


# Client Models
class ClientBase(BaseModel):
    display_name: str = Field(..., max_length=255)
    full_name: str = Field(..., max_length=255)
    ima_signed_date: Optional[date] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)
    ima_signed_date: Optional[date] = None


class Client(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    
    client_id: int
    valid_from: datetime
    valid_to: Optional[datetime] = None


# Contract Models
class ContractBase(BaseModel):
    client_id: int
    contract_number: Optional[str] = Field(None, max_length=100)
    provider_name: str = Field(..., max_length=255)
    contract_start_date: Optional[date] = None
    fee_type: Literal["flat", "percentage"] = Field(..., max_length=50)
    percent_rate: Optional[float] = None
    flat_rate: Optional[float] = None
    payment_schedule: Literal["monthly", "quarterly"] = Field(..., max_length=50)
    num_people: Optional[int] = None
    notes: Optional[str] = None


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    contract_number: Optional[str] = Field(None, max_length=100)
    provider_name: Optional[str] = Field(None, max_length=255)
    contract_start_date: Optional[date] = None
    fee_type: Optional[Literal["flat", "percentage"]] = Field(None, max_length=50)
    percent_rate: Optional[float] = None
    flat_rate: Optional[float] = None
    payment_schedule: Optional[Literal["monthly", "quarterly"]] = Field(None, max_length=50)
    num_people: Optional[int] = None
    notes: Optional[str] = None


class Contract(ContractBase):
    model_config = ConfigDict(from_attributes=True)
    
    contract_id: int
    valid_from: datetime
    valid_to: Optional[datetime] = None


# Payment Models
class PaymentBase(BaseModel):
    contract_id: int
    client_id: int
    received_date: date
    total_assets: float
    expected_fee: float
    actual_fee: float
    method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    applied_period_type: Literal["monthly", "quarterly"] = Field(..., max_length=10)
    applied_period: int = Field(..., ge=1, le=12)  # 1-12 for monthly, 1-4 for quarterly
    applied_year: int


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    received_date: Optional[date] = None
    total_assets: Optional[float] = None
    expected_fee: Optional[float] = None
    actual_fee: Optional[float] = None
    method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    applied_period_type: Optional[Literal["monthly", "quarterly"]] = Field(None, max_length=10)
    applied_period: Optional[int] = Field(None, ge=1, le=12)
    applied_year: Optional[int] = None


class Payment(PaymentBase):
    model_config = ConfigDict(from_attributes=True)
    
    payment_id: int
    valid_from: datetime
    valid_to: Optional[datetime] = None


# Client Metrics Model
class ClientMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    client_id: int
    last_payment_date: Optional[date] = None
    last_payment_amount: Optional[float] = None
    total_ytd_payments: Optional[float] = None
    avg_quarterly_payment: Optional[float] = None
    last_recorded_assets: Optional[float] = None
    last_updated: Optional[datetime] = None
    next_payment_due: Optional[date] = None


# View Models (for data from views)
class ClientWithStatus(Client):
    """Client data from clients_by_provider_view"""
    provider_name: Optional[str] = None
    payment_schedule: Optional[str] = None
    compliance_status: Literal["green", "yellow"]
    last_payment_date: Optional[date] = None
    next_payment_due: Optional[date] = None


class PaymentWithVariance(Payment):
    """Payment data from payment_variance_view"""
    variance_amount: float
    variance_percent: float
    variance_status: Literal["exact", "acceptable", "warning", "alert"]


class PaymentPeriod(BaseModel):
    """Available payment period from payment_periods table"""
    model_config = ConfigDict(from_attributes=True)
    
    period_type: Literal["monthly", "quarterly"]
    year: int
    period: int
    period_name: str
    start_date: date
    end_date: date
    is_current: bool = False


# Error Response Model
class ErrorResponse(BaseModel):
    error: dict[str, str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Client not found"
                }
            }
        }


# Dashboard Models
class DashboardClient(BaseModel):
    """Client information for dashboard"""
    client_id: int
    display_name: str
    full_name: str
    ima_signed_date: Optional[date] = None


class DashboardContract(BaseModel):
    """Contract details for dashboard"""
    contract_id: int
    provider_name: str
    fee_type: Literal["percentage", "flat"]
    percent_rate: Optional[float] = None
    flat_rate: Optional[float] = None
    payment_schedule: Literal["monthly", "quarterly"]


class DashboardPaymentStatus(BaseModel):
    """Current payment status for dashboard"""
    status: Literal["Paid", "Due"]
    current_period: str  # e.g., "December 2024" or "Q4 2024"
    current_period_number: int
    current_year: int
    last_payment_date: Optional[date] = None
    last_payment_amount: Optional[float] = None
    expected_fee: float


class DashboardCompliance(BaseModel):
    """Compliance information for dashboard"""
    status: Literal["compliant"] = "compliant"
    color: Literal["green", "yellow"]
    reason: str  # e.g., "Current period paid" or "Awaiting December 2024 payment"


class DashboardPayment(BaseModel):
    """Recent payment information for dashboard"""
    payment_id: int
    received_date: date
    actual_fee: float
    total_assets: float
    applied_period: int
    applied_year: int
    applied_period_type: Literal["monthly", "quarterly"]
    period_display: str  # e.g., "December 2024" or "Q4 2024"
    variance_amount: Optional[float] = None
    variance_percent: Optional[float] = None
    variance_status: Optional[Literal["exact", "acceptable", "warning", "alert"]] = None


class DashboardMetrics(BaseModel):
    """Payment metrics for dashboard"""
    total_ytd_payments: float
    avg_quarterly_payment: float
    last_recorded_assets: float
    next_payment_due: Optional[str] = None  # Formatted date string


class QuarterlySummary(BaseModel):
    """Quarterly payment summary for dashboard"""
    quarter: int
    year: int
    total_payments: float
    payment_count: int
    avg_payment: float
    expected_total: float


class DashboardResponse(BaseModel):
    """Complete dashboard response"""
    client: DashboardClient
    contract: DashboardContract
    payment_status: DashboardPaymentStatus
    compliance: DashboardCompliance
    recent_payments: list[DashboardPayment]
    metrics: DashboardMetrics
    quarterly_summaries: list[QuarterlySummary] = []