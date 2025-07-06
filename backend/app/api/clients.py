# backend/app/api/clients.py
"""Client endpoints using clients_by_provider_view for simplified queries"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
from datetime import datetime
import pyodbc

from app.database import db, create_error_response
from app.models import (
    Client, ClientCreate, ClientUpdate, ClientWithStatus, ErrorResponse
)
from app.auth import require_auth, TokenUser

router = APIRouter()


@router.get("/", response_model=List[ClientWithStatus])
async def get_clients(request: Request, user: TokenUser = Depends(require_auth)):
    """Get all clients with their status from clients_by_provider_view"""
    try:
        with db.get_cursor() as cursor:
            # Use the view that already joins everything we need
            query = """
                SELECT 
                    client_id, 
                    display_name, 
                    full_name, 
                    ima_signed_date,
                    valid_from,
                    valid_to,
                    provider_name,
                    payment_schedule,
                    compliance_status,
                    last_payment_date,
                    next_payment_due
                FROM clients_by_provider_view
                ORDER BY provider_name, display_name
            """
            cursor.execute(query)
            
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            
            clients = []
            for row in rows:
                client_dict = dict(zip(columns, row))
                clients.append(ClientWithStatus(**client_dict))
            
            return clients
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{client_id}", response_model=ClientWithStatus)
async def get_client(client_id: int, user: TokenUser = Depends(require_auth)):
    """Get single client with contract info"""
    try:
        with db.get_cursor() as cursor:
            query = """
                SELECT 
                    client_id, 
                    display_name, 
                    full_name, 
                    ima_signed_date,
                    valid_from,
                    valid_to,
                    provider_name,
                    payment_schedule,
                    compliance_status,
                    last_payment_date,
                    next_payment_due
                FROM clients_by_provider_view
                WHERE client_id = ?
            """
            cursor.execute(query, [client_id])
            
            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Client not found"
                )
            
            columns = [column[0] for column in cursor.description]
            client_dict = dict(zip(columns, row))
            
            return ClientWithStatus(**client_dict)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.post("/", response_model=Client)
async def create_client(client_data: ClientCreate, user: TokenUser = Depends(require_auth)):
    """Create new client"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO clients (
                    display_name, 
                    full_name, 
                    ima_signed_date
                )
                OUTPUT INSERTED.*
                VALUES (?, ?, ?)
            """, (
                client_data.display_name,
                client_data.full_name,
                client_data.ima_signed_date
            ))
            
            row = cursor.fetchone()
            columns = [column[0] for column in cursor.description]
            client_dict = dict(zip(columns, row))
            
            return Client(**client_dict)
            
    except pyodbc.IntegrityError as e:
        raise HTTPException(
            status_code=400,
            detail="Client with this name may already exist"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.put("/{client_id}", response_model=Client)
async def update_client(client_id: int, client_data: ClientUpdate, user: TokenUser = Depends(require_auth)):
    """Update existing client"""
    try:
        # Build dynamic update query based on provided fields
        update_fields = []
        params = []
        
        if client_data.display_name is not None:
            update_fields.append("display_name = ?")
            params.append(client_data.display_name)
        
        if client_data.full_name is not None:
            update_fields.append("full_name = ?")
            params.append(client_data.full_name)
        
        if client_data.ima_signed_date is not None:
            update_fields.append("ima_signed_date = ?")
            params.append(client_data.ima_signed_date)
        
        if not update_fields:
            raise HTTPException(
                status_code=400,
                detail="No fields to update"
            )
        
        # Add client_id to params
        params.append(client_id)
        
        with db.get_cursor() as cursor:
            query = f"""
                UPDATE clients
                SET {', '.join(update_fields)}
                OUTPUT INSERTED.*
                WHERE client_id = ? AND valid_to IS NULL
            """
            cursor.execute(query, params)
            
            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Client not found"
                )
            
            columns = [column[0] for column in cursor.description]
            client_dict = dict(zip(columns, row))
            
            return Client(**client_dict)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.delete("/{client_id}")
async def delete_client(client_id: int, user: TokenUser = Depends(require_auth)):
    """Soft delete client by setting valid_to timestamp"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                UPDATE clients
                SET valid_to = GETDATE()
                WHERE client_id = ? AND valid_to IS NULL
            """, [client_id])
            
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Client not found or already deleted"
                )
            
            return {"message": "Client deleted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )