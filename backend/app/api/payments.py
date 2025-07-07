# backend/app/api/payments.py
"""Payment endpoints using database views for variance calculations"""

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, HTTPException, Query, Depends  # type: ignore
from ..database import db, create_error_response
from ..models import PaymentCreate, PaymentUpdate, PaymentWithVariance
from ..auth import require_auth, TokenUser

router = APIRouter()

@router.get("/", response_model=List[PaymentWithVariance])
async def get_payments(
    client_id: int = Query(..., description="Client ID to get payments for"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    year: Optional[int] = Query(None, description="Filter by year"),
    user: TokenUser = Depends(require_auth)
):
    """Get all payments for a client with variance from payment_variance_view"""
    try:
        with db.get_cursor() as cursor:
            # Build query with optional year filter
            query = """
                SELECT 
                    pv.payment_id,
                    pv.contract_id,
                    pv.client_id,
                    pv.received_date,
                    pv.total_assets,
                    pv.expected_fee,
                    pv.actual_fee,
                    pv.method,
                    pv.notes,
                    pv.applied_period_type,
                    pv.applied_period,
                    pv.applied_year,
                    pv.variance_amount,
                    pv.variance_percent,
                    pv.variance_status
                FROM payment_variance_view pv
                WHERE pv.client_id = ?
            """
            params = [client_id]
            
            if year is not None:
                query += " AND pv.applied_year = ?"
                params.append(year)
                
            query += """ 
                ORDER BY pv.received_date DESC, pv.payment_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """
            params.extend([(page - 1) * limit, limit])
            
            cursor.execute(query, params)
            
            payments = []
            for row in cursor.fetchall():
                payment = PaymentWithVariance(
                    payment_id=row.payment_id,
                    contract_id=row.contract_id,
                    client_id=row.client_id,
                    received_date=row.received_date,
                    total_assets=row.total_assets,
                    expected_fee=row.expected_fee,
                    actual_fee=row.actual_fee,
                    method=row.method,
                    notes=row.notes,
                    applied_period_type=row.applied_period_type,
                    applied_period=row.applied_period,
                    applied_year=row.applied_year,
                    variance_amount=row.variance_amount,
                    variance_percent=row.variance_percent,
                    variance_status=row.variance_status
                )
                payments.append(payment)
            
            return payments
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response("PAYMENT_FETCH_ERROR", f"Failed to fetch payments: {str(e)}")
        )

@router.post("/", response_model=PaymentWithVariance)
async def create_payment(payment: PaymentCreate, user: TokenUser = Depends(require_auth)):
    """Create a new payment - applies to single period only"""
    try:
        with db.get_cursor() as cursor:
            
            # Validate client exists
            cursor.execute("SELECT client_id FROM clients WHERE client_id = ? AND valid_to IS NULL", payment.client_id)
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=create_error_response("CLIENT_NOT_FOUND", f"Client {payment.client_id} not found")
                )
            
            # Validate contract exists
            cursor.execute("SELECT contract_id FROM contracts WHERE contract_id = ? AND valid_to IS NULL", payment.contract_id)
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=create_error_response("CONTRACT_NOT_FOUND", f"Contract {payment.contract_id} not found")
                )
            
            # Insert payment - single period only (no split payments)
            cursor.execute("""
                INSERT INTO payments (
                    contract_id, client_id, received_date, total_assets,
                    expected_fee, actual_fee, method, notes,
                    applied_period_type, applied_period, applied_year
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payment.contract_id,
                payment.client_id,
                payment.received_date,
                payment.total_assets,
                payment.expected_fee,
                payment.actual_fee,
                payment.method,
                payment.notes,
                payment.applied_period_type,
                payment.applied_period,
                payment.applied_year
            ))
            
            payment_id = cursor.execute("SELECT SCOPE_IDENTITY()").fetchval()
            
            # Return the created payment with variance from view
            cursor.execute("""
                SELECT 
                    pv.payment_id,
                    pv.contract_id,
                    pv.client_id,
                    pv.received_date,
                    pv.total_assets,
                    pv.expected_fee,
                    pv.actual_fee,
                    pv.method,
                    pv.notes,
                    pv.applied_period_type,
                    pv.applied_period,
                    pv.applied_year,
                    pv.variance_amount,
                    pv.variance_percent,
                    pv.variance_status
                FROM payment_variance_view pv
                WHERE pv.payment_id = ?
            """, payment_id)
            
            row = cursor.fetchone()
            return PaymentWithVariance(
                payment_id=row.payment_id,
                contract_id=row.contract_id,
                client_id=row.client_id,
                received_date=row.received_date,
                total_assets=row.total_assets,
                expected_fee=row.expected_fee,
                actual_fee=row.actual_fee,
                method=row.method,
                notes=row.notes,
                applied_period_type=row.applied_period_type,
                applied_period=row.applied_period,
                applied_year=row.applied_year,
                variance_amount=row.variance_amount,
                variance_percent=row.variance_percent,
                variance_status=row.variance_status
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response("PAYMENT_CREATE_ERROR", f"Failed to create payment: {str(e)}")
        )

@router.put("/{payment_id}", response_model=PaymentWithVariance)
async def update_payment(payment_id: int, payment: PaymentUpdate, user: TokenUser = Depends(require_auth)):
    """Update an existing payment"""
    try:
        with db.get_cursor() as cursor:
            
            # Check if payment exists
            cursor.execute("SELECT payment_id FROM payments WHERE payment_id = ? AND valid_to IS NULL", payment_id)
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=create_error_response("PAYMENT_NOT_FOUND", f"Payment {payment_id} not found")
                )
            
            # Build dynamic update query
            update_fields = []
            params = []
            
            if payment.received_date is not None:
                update_fields.append("received_date = ?")
                params.append(payment.received_date)
            if payment.total_assets is not None:
                update_fields.append("total_assets = ?")
                params.append(payment.total_assets)
            if payment.expected_fee is not None:
                update_fields.append("expected_fee = ?")
                params.append(payment.expected_fee)
            if payment.actual_fee is not None:
                update_fields.append("actual_fee = ?")
                params.append(payment.actual_fee)
            if payment.method is not None:
                update_fields.append("method = ?")
                params.append(payment.method)
            if payment.notes is not None:
                update_fields.append("notes = ?")
                params.append(payment.notes)
            if payment.applied_period_type is not None:
                update_fields.append("applied_period_type = ?")
                params.append(payment.applied_period_type)
            if payment.applied_period is not None:
                update_fields.append("applied_period = ?")
                params.append(payment.applied_period)
            if payment.applied_year is not None:
                update_fields.append("applied_year = ?")
                params.append(payment.applied_year)
            
            if update_fields:
                params.append(payment_id)
                query = f"UPDATE payments SET {', '.join(update_fields)} WHERE payment_id = ?"
                cursor.execute(query, params)
            
            # Return updated payment with variance from view
            cursor.execute("""
                SELECT 
                    pv.payment_id,
                    pv.contract_id,
                    pv.client_id,
                    pv.received_date,
                    pv.total_assets,
                    pv.expected_fee,
                    pv.actual_fee,
                    pv.method,
                    pv.notes,
                    pv.applied_period_type,
                    pv.applied_period,
                    pv.applied_year,
                    pv.variance_amount,
                    pv.variance_percent,
                    pv.variance_status
                FROM payment_variance_view pv
                WHERE pv.payment_id = ?
            """, payment_id)
            
            row = cursor.fetchone()
            return PaymentWithVariance(
                payment_id=row.payment_id,
                contract_id=row.contract_id,
                client_id=row.client_id,
                received_date=row.received_date,
                total_assets=row.total_assets,
                expected_fee=row.expected_fee,
                actual_fee=row.actual_fee,
                method=row.method,
                notes=row.notes,
                applied_period_type=row.applied_period_type,
                applied_period=row.applied_period,
                applied_year=row.applied_year,
                variance_amount=row.variance_amount,
                variance_percent=row.variance_percent,
                variance_status=row.variance_status
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response("PAYMENT_UPDATE_ERROR", f"Failed to update payment: {str(e)}")
        )

@router.delete("/{payment_id}")
async def delete_payment(payment_id: int, user: TokenUser = Depends(require_auth)):
    """Soft delete a payment"""
    try:
        with db.get_cursor() as cursor:
            
            # Check if payment exists
            cursor.execute("SELECT payment_id FROM payments WHERE payment_id = ? AND valid_to IS NULL", payment_id)
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=create_error_response("PAYMENT_NOT_FOUND", f"Payment {payment_id} not found")
                )
            
            # Soft delete by setting valid_to
            cursor.execute("""
                UPDATE payments 
                SET valid_to = GETDATE() 
                WHERE payment_id = ? AND valid_to IS NULL
            """, payment_id)
            
            return {"message": f"Payment {payment_id} deleted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response("PAYMENT_DELETE_ERROR", f"Failed to delete payment: {str(e)}")
        )