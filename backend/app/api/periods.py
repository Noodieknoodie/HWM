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
    """Get available periods for payment entry - simple logic based on current period back to first payment"""
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
            
            # Get the earliest payment to determine start of range
            cursor.execute("""
                SELECT MIN(applied_year) as earliest_year, 
                       MIN(CASE WHEN applied_year = (SELECT MIN(applied_year) FROM payments WHERE client_id = ? AND valid_to IS NULL) 
                            THEN applied_period ELSE NULL END) as earliest_period
                FROM payments
                WHERE client_id = ? AND valid_to IS NULL
            """, (client_id, client_id))
            
            result = cursor.fetchone()
            earliest_year = result.earliest_year
            earliest_period = result.earliest_period
            
<<<<<<< HEAD
            # Get current period (one period back from today for arrears billing)
            cursor.execute("""
                SELECT 
                    CASE 
                        WHEN ? = 'monthly' THEN 
                            CASE WHEN MONTH(GETDATE()) = 1 THEN 12 ELSE MONTH(GETDATE()) - 1 END
                        WHEN ? = 'quarterly' THEN 
                            CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN 4 ELSE DATEPART(QUARTER, GETDATE()) - 1 END
                    END AS current_period,
                    CASE 
                        WHEN (MONTH(GETDATE()) = 1 AND ? = 'monthly') OR 
                             (DATEPART(QUARTER, GETDATE()) = 1 AND ? = 'quarterly')
                        THEN YEAR(GETDATE()) - 1
                        ELSE YEAR(GETDATE())
                    END AS current_year
            """, (payment_schedule, payment_schedule, payment_schedule, payment_schedule))
            
            current_result = cursor.fetchone()
            current_year = current_result.current_year
            current_period = current_result.current_period
            
            # If no payments exist, go back 2 years from current
            if not earliest_year:
                earliest_year = current_year - 2
                earliest_period = 1
            
            # Debug logging
            print(f"DEBUG: payment_schedule={payment_schedule}, earliest_year={earliest_year}, earliest_period={earliest_period}, current_year={current_year}, current_period={current_period}")
            
            # Check if payment_periods table has data
            cursor.execute("SELECT COUNT(*) as count FROM payment_periods WHERE period_type = ?", (payment_schedule,))
            total_count = cursor.fetchone().count
            print(f"DEBUG: Total {payment_schedule} periods in table: {total_count}")
            
            # Get all periods in range from payment_periods table
            # Simplified query to handle all cases
            cursor.execute("""
                SELECT 
=======
            # Query payment_periods table for unpaid periods
            # Join with payments to find which periods are already paid
            # Modified to show periods starting from one period prior to current date
            query = """
                SELECT DISTINCT
>>>>>>> 846e2b3c3af10e45c0fd2ae1f5931f349609e24f
                    pp.period_type,
                    pp.year,
                    pp.period,
                    pp.period_name,
                    pp.start_date,
                    pp.end_date
                FROM payment_periods pp
                WHERE 
                    pp.period_type = ? AND
<<<<<<< HEAD
                    (
                        (pp.year = ? AND pp.period >= ? AND pp.year = ? AND pp.period <= ?) OR  -- Same year
                        (pp.year = ? AND pp.period >= ? AND ? <> ?) OR  -- Earliest year (different from current)
                        (pp.year = ? AND pp.period <= ? AND ? <> ?) OR  -- Current year (different from earliest)
                        (pp.year > ? AND pp.year < ?)  -- Years in between
                    )
                ORDER BY pp.year DESC, pp.period DESC
            """, (payment_schedule,
                  earliest_year, earliest_period, current_year, current_period,  # Same year case
                  earliest_year, earliest_period, earliest_year, current_year,  # Earliest year
                  current_year, current_period, earliest_year, current_year,  # Current year
                  earliest_year, current_year))  # Years in between
=======
                    p.payment_id IS NULL AND
                    -- Show periods starting from one period prior to current date
                    (
                        -- For monthly: show periods from previous month onwards
                        (pp.period_type = 'monthly' AND 
                         (pp.year < YEAR(GETDATE()) OR 
                          (pp.year = YEAR(GETDATE()) AND pp.period <= MONTH(GETDATE()))))
                        OR
                        -- For quarterly: show periods from previous quarter onwards  
                        (pp.period_type = 'quarterly' AND
                         (pp.year < YEAR(GETDATE()) OR
                          (pp.year = YEAR(GETDATE()) AND pp.period <= CEILING(MONTH(GETDATE()) / 3.0))))
                    )
            """
            
            params = [client_id, payment_schedule]
            
            # If there's payment history, start from earliest payment year
            # Otherwise, look back up to 5 years for comprehensive list
            if earliest_year:
                query += " AND pp.year >= ?"
                params.append(earliest_year)
            else:
                # Show periods going back 5 years if no payment history
                query += " AND pp.year >= YEAR(GETDATE()) - 5"
            
            query += " ORDER BY pp.year DESC, pp.period DESC"
            
            cursor.execute(query, params)
>>>>>>> 846e2b3c3af10e45c0fd2ae1f5931f349609e24f
            
            period_options = []
            rows = cursor.fetchall()
            print(f"DEBUG: Found {len(rows)} periods from payment_periods table")
            
            for row in rows:
                # Create value string for frontend (period-year format)
                value = f"{row.period}-{row.year}"
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