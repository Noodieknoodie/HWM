# backend/test_backend.py
"""
Simple test script to verify backend is working correctly after file removal.
Run with: python test_backend.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pyodbc
from datetime import date
from app.database import db
from app import models


def test_database_connection():
    """Test that we can connect to the database"""
    print("Testing database connection...")
    try:
        with db.get_cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            assert result[0] == 1
        print("✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


def test_models():
    """Test that all models work without file fields"""
    print("\nTesting models...")
    errors = []
    
    try:
        # Test Client models
        client = models.ClientBase(
            display_name="Test Client",
            full_name="Test Client LLC",
            ima_signed_date=date.today()
        )
        assert not hasattr(client, 'onedrive_folder_path')
        print("✓ ClientBase model OK (no file fields)")
        
        # Test Payment model
        payment = models.PaymentWithVariance(
            payment_id=1,
            contract_id=1,
            client_id=1,
            received_date=date.today(),
            total_assets=100000,
            expected_fee=1000,
            actual_fee=1000,
            applied_period_type="monthly",
            applied_period=1,
            applied_year=2025,
            variance_amount=0,
            variance_percent=0,
            variance_status="exact"
        )
        assert not hasattr(payment, 'has_file')
        print("✓ PaymentWithVariance model OK (no file fields)")
        
        # Test Dashboard models
        dashboard_client = models.DashboardClient(
            client_id=1,
            display_name="Test",
            full_name="Test LLC",
            ima_signed_date=date.today()
        )
        assert not hasattr(dashboard_client, 'onedrive_folder_path')
        print("✓ DashboardClient model OK (no file fields)")
        
        dashboard_payment = models.DashboardPayment(
            payment_id=1,
            received_date=date.today(),
            actual_fee=1000,
            total_assets=100000,
            applied_period=1,
            applied_year=2025,
            applied_period_type="monthly",
            period_display="January 2025"
        )
        assert not hasattr(dashboard_payment, 'has_files')
        print("✓ DashboardPayment model OK (no file fields)")
        
    except Exception as e:
        errors.append(f"Model test failed: {e}")
    
    return len(errors) == 0


def test_views():
    """Test that database views work correctly"""
    print("\nTesting database views...")
    
    try:
        with db.get_cursor() as cursor:
            # Test clients_by_provider_view
            cursor.execute("""
                SELECT TOP 1 
                    client_id, display_name, compliance_status 
                FROM clients_by_provider_view
            """)
            columns = [col[0] for col in cursor.description]
            assert 'onedrive_folder_path' not in columns
            print("✓ clients_by_provider_view OK (no file columns)")
            
            # Test payment_variance_view
            cursor.execute("""
                SELECT TOP 1 
                    payment_id, variance_amount, variance_status 
                FROM payment_variance_view
            """)
            columns = [col[0] for col in cursor.description]
            assert 'has_file' not in columns
            print("✓ payment_variance_view OK (no file columns)")
            
            # Test client_payment_status view
            cursor.execute("""
                SELECT TOP 1 
                    client_id, payment_status, expected_fee 
                FROM client_payment_status
            """)
            print("✓ client_payment_status view OK")
            
        return True
    except Exception as e:
        print(f"✗ View test failed: {e}")
        return False


def test_tables():
    """Test that file-related tables don't exist"""
    print("\nTesting that file tables are removed...")
    
    try:
        with db.get_cursor() as cursor:
            # Check client_files table doesn't exist
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'client_files'
            """)
            assert cursor.fetchone()[0] == 0
            print("✓ client_files table removed")
            
            # Check payment_files table doesn't exist
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'payment_files'
            """)
            assert cursor.fetchone()[0] == 0
            print("✓ payment_files table removed")
            
            # Check clients table doesn't have onedrive_folder_path
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'clients' 
                AND COLUMN_NAME = 'onedrive_folder_path'
            """)
            assert cursor.fetchone()[0] == 0
            print("✓ onedrive_folder_path column removed from clients")
            
        return True
    except Exception as e:
        print(f"✗ Table test failed: {e}")
        return False


def test_sample_queries():
    """Test some real-world queries to ensure they work"""
    print("\nTesting sample queries...")
    
    try:
        with db.get_cursor() as cursor:
            # Test a typical client query
            cursor.execute("""
                SELECT 
                    client_id, display_name, compliance_status
                FROM clients_by_provider_view
                WHERE valid_to IS NULL
            """)
            print(f"✓ Found {cursor.rowcount} clients in view")
            
            # Test a payment query
            cursor.execute("""
                SELECT 
                    p.payment_id, p.actual_fee, p.variance_amount
                FROM payment_variance_view p
                WHERE p.variance_status = 'exact'
            """)
            print(f"✓ Found {cursor.rowcount} exact payments")
            
        return True
    except Exception as e:
        print(f"✗ Query test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Backend Verification Tests")
    print("=" * 60)
    
    tests = [
        test_database_connection,
        test_models,
        test_views,
        test_tables,
        test_sample_queries
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"SUMMARY: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("\n✅ All tests passed! Backend is ready to go.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()