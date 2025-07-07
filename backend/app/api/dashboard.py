# backend/app/api/dashboard.py
"""Dashboard endpoints for unified client data access"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Path, Depends  # type: ignore
from app.database import Database, create_error_response
from app.models import (
    DashboardResponse, DashboardClient, DashboardContract, 
    DashboardPaymentStatus, DashboardCompliance, DashboardPayment,
    DashboardMetrics, QuarterlySummary
)
from app.auth import require_auth, TokenUser

router = APIRouter()

# Month names for period display
MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]


def format_period_display(period_type: str, period: int, year: int) -> str:
    """Format period for display (e.g., 'December 2024' or 'Q4 2024')"""
    if period_type == "monthly":
        return f"{MONTH_NAMES[period]} {year}"
    else:  # quarterly
        return f"Q{period} {year}"


@router.get("/{client_id}", response_model=DashboardResponse)
async def get_dashboard(client_id: int = Path(..., description="Client ID"), user: TokenUser = Depends(require_auth)):
    """Get unified dashboard data for a client"""
    
    db = Database()
    
    try:
        with db.get_cursor() as cursor:
            # Main query using clients_by_provider_view and client_payment_status
            cursor.execute("""
                SELECT 
                    c.client_id,
                    c.display_name,
                    c.full_name,
                    c.ima_signed_date,
                    c.contract_id,
                    c.provider_name,
                    c.fee_type,
                    c.percent_rate,
                    c.flat_rate,
                    c.payment_schedule,
                    c.compliance_status,
                    c.last_payment_date,
                    c.last_payment_amount,
                    c.last_recorded_assets,
                    c.total_ytd_payments,
                    ps.current_period,
                    ps.current_year,
                    ps.expected_fee,
                    ps.payment_status,
                    cm.avg_quarterly_payment
                FROM clients_by_provider_view c
                LEFT JOIN client_payment_status ps ON c.client_id = ps.client_id
                LEFT JOIN client_metrics cm ON c.client_id = cm.client_id
                WHERE c.client_id = ? AND c.valid_to IS NULL
            """, client_id)
            
            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=create_error_response("NOT_FOUND", f"Client {client_id} not found")
                )
            
            # Build client info
            client = DashboardClient(
                client_id=row.client_id,
                display_name=row.display_name,
                full_name=row.full_name,
                ima_signed_date=row.ima_signed_date
            )
            
            # Build contract info
            contract = DashboardContract(
                contract_id=row.contract_id,
                provider_name=row.provider_name,
                fee_type=row.fee_type,
                percent_rate=row.percent_rate,
                flat_rate=row.flat_rate,
                payment_schedule=row.payment_schedule
            )
            
            # Build payment status
            period_display = format_period_display(
                row.payment_schedule, 
                row.current_period, 
                row.current_year
            )
            
            payment_status = DashboardPaymentStatus(
                status=row.payment_status,
                current_period=period_display,
                current_period_number=row.current_period,
                current_year=row.current_year,
                last_payment_date=row.last_payment_date,
                last_payment_amount=row.last_payment_amount,
                expected_fee=row.expected_fee
            )
            
            # Build compliance info
            compliance_color = "green" if row.payment_status == "Paid" else "yellow"
            compliance_reason = (
                "Current period paid" if row.payment_status == "Paid" 
                else f"Awaiting {period_display} payment"
            )
            
            compliance = DashboardCompliance(
                status="compliant",
                color=compliance_color,
                reason=compliance_reason
            )
            
            # Get recent payments with variance from payment_variance_view
            cursor.execute("""
                SELECT TOP 10
                    pv.payment_id,
                    pv.received_date,
                    pv.actual_fee,
                    pv.total_assets,
                    pv.applied_period,
                    pv.applied_year,
                    pv.applied_period_type,
                    pv.variance_amount,
                    pv.variance_percent,
                    pv.variance_status
                FROM payment_variance_view pv
                WHERE pv.client_id = ? AND pv.valid_to IS NULL
                ORDER BY pv.received_date DESC, pv.payment_id DESC
            """, client_id)
            
            recent_payments = []
            for payment_row in cursor.fetchall():
                period_display = format_period_display(
                    payment_row.applied_period_type,
                    payment_row.applied_period,
                    payment_row.applied_year
                )
                
                # Handle None values and validate variance_status
                variance_status = payment_row.variance_status
                if variance_status not in ["exact", "acceptable", "warning", "alert"]:
                    variance_status = None  # Set to None if not a valid value
                
                recent_payments.append(DashboardPayment(
                    payment_id=payment_row.payment_id,
                    received_date=payment_row.received_date,
                    actual_fee=payment_row.actual_fee,
                    total_assets=payment_row.total_assets or 0.0,  # Default to 0.0 if None
                    applied_period=payment_row.applied_period,
                    applied_year=payment_row.applied_year,
                    applied_period_type=payment_row.applied_period_type,
                    period_display=period_display,
                    variance_amount=payment_row.variance_amount,
                    variance_percent=payment_row.variance_percent,
                    variance_status=variance_status
                ))
            
            # Build metrics
            metrics = DashboardMetrics(
                total_ytd_payments=row.total_ytd_payments or 0.0,
                avg_quarterly_payment=row.avg_quarterly_payment or 0.0,
                last_recorded_assets=row.last_recorded_assets or 0.0,
                next_payment_due=None
            )
            
            # Get quarterly summaries for current year
            current_year = datetime.now().year
            cursor.execute("""
                SELECT 
                    quarter,
                    year,
                    total_payments,
                    payment_count,
                    avg_payment,
                    expected_total
                FROM quarterly_summaries
                WHERE client_id = ? AND year = ?
                ORDER BY quarter
            """, client_id, current_year)
            
            quarterly_summaries = []
            for q_row in cursor.fetchall():
                quarterly_summaries.append(QuarterlySummary(
                    quarter=q_row.quarter,
                    year=q_row.year,
                    total_payments=q_row.total_payments,
                    payment_count=q_row.payment_count,
                    avg_payment=q_row.avg_payment,
                    expected_total=q_row.expected_total or 0.0
                ))
            
            # Build complete response
            return DashboardResponse(
                client=client,
                contract=contract,
                payment_status=payment_status,
                compliance=compliance,
                recent_payments=recent_payments,
                metrics=metrics,
                quarterly_summaries=quarterly_summaries
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ DASHBOARD ERROR: {str(e)}")  # Add this debug line
        raise HTTPException(
            status_code=500,
            detail=create_error_response("INTERNAL_ERROR", str(e))
        )