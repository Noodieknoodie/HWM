# backend/app/api/periods.py
"""Smart periods endpoint using payment_periods table"""

from typing import List
from fastapi import APIRouter, HTTPException, Query, Depends  # type: ignore
from ..database import db, create_error_response
from ..models import PaymentPeriod, PeriodOption, PeriodsResponse
from ..auth import require_auth, TokenUser

router = APIRouter()

@router.get("/", response_model=PeriodsResponse)
async def get_available_periods(
    client_id: int = Query(..., description="Client ID to get periods for"),
    contract_id: int = Query(..., description="Contract ID to get periods for"),
    user: TokenUser = Depends(require_auth)
):
    """Get unpaid periods from payment_periods table - no dynamic generation"""
    try:
        with db.get_cursor() as cursor:
            
            # Get contract's payment schedule
            cursor.execute("""
                SELECT payment_schedule 
                FROM contracts 
                WHERE contract_id = ? AND client_id = ? AND valid_to IS NULL
            """, (contract_id, client_id))
            
            contract = cursor.fetchone()
            if not contract:
                raise HTTPException(
                    status_code=404,
                    detail=create_error_response("CONTRACT_NOT_FOUND", f"Contract {contract_id} not found for client {client_id}")
                )
            
            payment_schedule = contract.payment_schedule
            
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
            
            period_options = []
            for row in cursor.fetchall():
                # Create value string for frontend
                value = f"{row.year}-{row.period:02d}"
                # period_name already includes the year, so just use it directly
                label = row.period_name
                
                option = PeriodOption(
                    value=value,
                    label=label,
                    period=row.period,
                    year=row.year,
                    period_type=row.period_type
                )
                period_options.append(option)
            
            return PeriodsResponse(
                periods=period_options,
                payment_schedule=payment_schedule
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response("PERIODS_FETCH_ERROR", f"Failed to fetch periods: {str(e)}")
        )