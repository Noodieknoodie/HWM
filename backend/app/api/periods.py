# backend/app/api/periods.py
"""Smart periods endpoint using payment_periods table"""

from typing import List
from fastapi import APIRouter, HTTPException, Query
from ..database import db, create_error_response
from ..models import PaymentPeriod

router = APIRouter()

@router.get("/", response_model=List[PaymentPeriod])
async def get_available_periods(
    client_id: int = Query(..., description="Client ID to get periods for"),
    payment_schedule: str = Query(..., description="Payment schedule (monthly/quarterly)")
):
    """Get unpaid periods from payment_periods table - no dynamic generation"""
    try:
        with db.get_cursor() as cursor:
            
            # Get client's contract to validate schedule type
            cursor.execute("""
                SELECT contract_id, payment_schedule 
                FROM contracts 
                WHERE client_id = ? AND valid_to IS NULL
            """, client_id)
            
            contract = cursor.fetchone()
            if not contract:
                raise HTTPException(
                    status_code=404,
                    detail=create_error_response("CONTRACT_NOT_FOUND", f"No active contract found for client {client_id}")
                )
            
            # Validate payment schedule matches contract
            if contract.payment_schedule.lower() != payment_schedule.lower():
                raise HTTPException(
                    status_code=400,
                    detail=create_error_response("SCHEDULE_MISMATCH", f"Payment schedule '{payment_schedule}' does not match contract schedule '{contract.payment_schedule}'")
                )
            
            # Get the earliest payment year or current year
            cursor.execute("""
                SELECT MIN(applied_year) as earliest_year
                FROM payments
                WHERE client_id = ? AND valid_to IS NULL
            """, client_id)
            
            result = cursor.fetchone()
            earliest_year = result.earliest_year if result and result.earliest_year else None
            
            # Query payment_periods table for unpaid periods
            # Join with payments to find which periods are already paid
            query = """
                SELECT DISTINCT
                    pp.period_type,
                    pp.year,
                    pp.period,
                    pp.period_name,
                    pp.start_date,
                    pp.end_date,
                    pp.is_current
                FROM payment_periods pp
                LEFT JOIN payments p ON 
                    p.client_id = ? AND
                    p.applied_period_type = pp.period_type AND
                    p.applied_year = pp.year AND
                    p.applied_period = pp.period AND
                    p.valid_to IS NULL
                WHERE 
                    pp.period_type = ? AND
                    p.payment_id IS NULL AND
                    pp.end_date < GETDATE()
            """
            
            params = [client_id, payment_schedule]
            
            # If there's payment history, start from earliest payment year
            # Otherwise, start from current year
            if earliest_year:
                query += " AND pp.year >= ?"
                params.append(earliest_year)
            else:
                query += " AND pp.year = YEAR(GETDATE())"
            
            query += " ORDER BY pp.year DESC, pp.period DESC"
            
            cursor.execute(query, params)
            
            periods = []
            for row in cursor.fetchall():
                period = PaymentPeriod(
                    period_type=row.period_type,
                    year=row.year,
                    period=row.period,
                    period_name=row.period_name,
                    start_date=row.start_date,
                    end_date=row.end_date,
                    is_current=row.is_current
                )
                periods.append(period)
            
            return periods
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response("PERIODS_FETCH_ERROR", f"Failed to fetch periods: {str(e)}")
        )