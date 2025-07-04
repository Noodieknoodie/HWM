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
    onedrive_folder_path: Optional[str] = Field(None, max_length=500)


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)
    ima_signed_date: Optional[date] = None
    onedrive_folder_path: Optional[str] = Field(None, max_length=500)


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
    has_file: bool = False


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