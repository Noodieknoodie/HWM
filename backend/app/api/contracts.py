# backend/app/api/contracts.py
"""Contract endpoints for managing client contracts"""

from fastapi import APIRouter, HTTPException, Depends  # type: ignore
from typing import List
import pyodbc  # type: ignore

from app.database import db, create_error_response
from app.models import (
    Contract, ContractCreate, ContractUpdate, ErrorResponse
)
from app.auth import require_auth, TokenUser

router = APIRouter()


@router.get("/client/{client_id}", response_model=List[Contract])
async def get_client_contracts(client_id: int, user: TokenUser = Depends(require_auth)):
    """Get all contracts for a specific client"""
    try:
        with db.get_cursor() as cursor:
            query = """
                SELECT *
                FROM contracts
                WHERE client_id = ? AND valid_to IS NULL
                ORDER BY contract_start_date DESC
            """
            cursor.execute(query, [client_id])
            
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            
            contracts = []
            for row in rows:
                contract_dict = dict(zip(columns, row))
                contracts.append(Contract(**contract_dict))
            
            return contracts
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.post("/", response_model=Contract)
async def create_contract(contract_data: ContractCreate, user: TokenUser = Depends(require_auth)):
    """Create new contract"""
    try:
        # Validate fee type and rates
        if contract_data.fee_type == "percentage" and contract_data.percent_rate is None:
            raise HTTPException(
                status_code=400,
                detail="Percentage rate required for percentage fee type"
            )
        if contract_data.fee_type == "flat" and contract_data.flat_rate is None:
            raise HTTPException(
                status_code=400,
                detail="Flat rate required for flat fee type"
            )
        
        with db.get_cursor() as cursor:
            # Check if client exists
            cursor.execute(
                "SELECT 1 FROM clients WHERE client_id = ? AND valid_to IS NULL",
                [contract_data.client_id]
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Client not found"
                )
            
            # Insert contract
            cursor.execute("""
                INSERT INTO contracts (
                    client_id, 
                    contract_number,
                    provider_name,
                    contract_start_date,
                    fee_type,
                    percent_rate,
                    flat_rate,
                    payment_schedule,
                    num_people,
                    notes
                )
                OUTPUT INSERTED.*
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                contract_data.client_id,
                contract_data.contract_number,
                contract_data.provider_name,
                contract_data.contract_start_date,
                contract_data.fee_type,
                contract_data.percent_rate,
                contract_data.flat_rate,
                contract_data.payment_schedule,
                contract_data.num_people,
                contract_data.notes
            ))
            
            row = cursor.fetchone()
            columns = [column[0] for column in cursor.description]
            contract_dict = dict(zip(columns, row))
            
            return Contract(**contract_dict)
            
    except HTTPException:
        raise
    except pyodbc.IntegrityError as e:
        raise HTTPException(
            status_code=400,
            detail="Contract creation failed - check data integrity"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.put("/{contract_id}", response_model=Contract)
async def update_contract(contract_id: int, contract_data: ContractUpdate, user: TokenUser = Depends(require_auth)):
    """Update existing contract"""
    try:
        # Build dynamic update query
        update_fields = []
        params = []
        
        if contract_data.contract_number is not None:
            update_fields.append("contract_number = ?")
            params.append(contract_data.contract_number)
        
        if contract_data.provider_name is not None:
            update_fields.append("provider_name = ?")
            params.append(contract_data.provider_name)
        
        if contract_data.contract_start_date is not None:
            update_fields.append("contract_start_date = ?")
            params.append(contract_data.contract_start_date)
        
        if contract_data.fee_type is not None:
            update_fields.append("fee_type = ?")
            params.append(contract_data.fee_type)
        
        if contract_data.percent_rate is not None:
            update_fields.append("percent_rate = ?")
            params.append(contract_data.percent_rate)
        
        if contract_data.flat_rate is not None:
            update_fields.append("flat_rate = ?")
            params.append(contract_data.flat_rate)
        
        if contract_data.payment_schedule is not None:
            update_fields.append("payment_schedule = ?")
            params.append(contract_data.payment_schedule)
        
        if contract_data.num_people is not None:
            update_fields.append("num_people = ?")
            params.append(contract_data.num_people)
        
        if contract_data.notes is not None:
            update_fields.append("notes = ?")
            params.append(contract_data.notes)
        
        if not update_fields:
            raise HTTPException(
                status_code=400,
                detail="No fields to update"
            )
        
        # Add contract_id to params
        params.append(contract_id)
        
        with db.get_cursor() as cursor:
            # Get current contract to validate fee type changes
            cursor.execute(
                "SELECT fee_type FROM contracts WHERE contract_id = ? AND valid_to IS NULL",
                [contract_id]
            )
            current_contract = cursor.fetchone()
            if not current_contract:
                raise HTTPException(
                    status_code=404,
                    detail="Contract not found"
                )
            
            # Validate fee type and rates if changing
            if contract_data.fee_type is not None:
                if contract_data.fee_type == "percentage" and contract_data.percent_rate is None:
                    # Check if there's an existing percent_rate
                    cursor.execute(
                        "SELECT percent_rate FROM contracts WHERE contract_id = ?",
                        [contract_id]
                    )
                    existing_rate = cursor.fetchone()
                    if not existing_rate or existing_rate[0] is None:
                        raise HTTPException(
                            status_code=400,
                            detail="Percentage rate required when changing to percentage fee type"
                        )
                elif contract_data.fee_type == "flat" and contract_data.flat_rate is None:
                    # Check if there's an existing flat_rate
                    cursor.execute(
                        "SELECT flat_rate FROM contracts WHERE contract_id = ?",
                        [contract_id]
                    )
                    existing_rate = cursor.fetchone()
                    if not existing_rate or existing_rate[0] is None:
                        raise HTTPException(
                            status_code=400,
                            detail="Flat rate required when changing to flat fee type"
                        )
            
            # Update contract
            query = f"""
                UPDATE contracts
                SET {', '.join(update_fields)}
                OUTPUT INSERTED.*
                WHERE contract_id = ? AND valid_to IS NULL
            """
            cursor.execute(query, params)
            
            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Contract not found"
                )
            
            columns = [column[0] for column in cursor.description]
            contract_dict = dict(zip(columns, row))
            
            return Contract(**contract_dict)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )