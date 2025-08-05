import json
import pyodbc
from datetime import datetime
from collections import defaultdict

def get_db_connection():
    return pyodbc.connect(
        "Driver={ODBC Driver 18 for SQL Server};"
        "Server=tcp:hohimerpro-db-server.database.windows.net,1433;"
        "Database=HohimerPro-401k;"
        "Uid=CloudSAddb51659;"
        "Pwd=Prunes27$$$$;"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )

def load_reconciliation_results():
    """Load the reconciliation results with missing payments"""
    with open('reconciliation_results.json', 'r') as f:
        return json.load(f)

def validate_client_contract_exists(conn, client_id, contract_id):
    """Check if client and contract exist in database"""
    cursor = conn.cursor()
    
    # Check client exists
    cursor.execute("SELECT COUNT(*) FROM clients_all WHERE client_id = ?", client_id)
    if cursor.fetchone()[0] == 0:
        return False, f"Client {client_id} not found"
    
    # Check contract exists
    cursor.execute("SELECT COUNT(*) FROM contracts WHERE contract_id = ? AND client_id = ?", 
                   contract_id, client_id)
    if cursor.fetchone()[0] == 0:
        return False, f"Contract {contract_id} not found for client {client_id}"
    
    return True, "OK"

def check_duplicate_payments(conn, payments):
    """Check if any payments might already exist (safety check)"""
    cursor = conn.cursor()
    potential_dupes = []
    
    for payment in payments:
        # Check for exact match on client, amount, and date
        cursor.execute("""
            SELECT payment_id, received_date, actual_fee, notes
            FROM payments
            WHERE client_id = ? 
              AND actual_fee = ?
              AND received_date = ?
        """, payment['client_id'], payment['actual_fee'], payment['received_date'])
        
        existing = cursor.fetchall()
        if existing:
            potential_dupes.append({
                'new_payment': payment,
                'existing': [{'payment_id': row[0], 'date': str(row[1]), 
                             'amount': row[2], 'notes': row[3]} for row in existing]
            })
    
    return potential_dupes

def analyze_missing_payments(missing_payments):
    """Analyze patterns in missing payments"""
    by_client = defaultdict(list)
    by_month = defaultdict(list)
    by_provider = defaultdict(list)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    for payment in missing_payments:
        by_client[payment['client_id']].append(payment)
        
        # Get month
        date = payment['received_date']
        month_key = date[:7]  # YYYY-MM
        by_month[month_key].append(payment)
        
        # Get provider from contract
        cursor.execute("""
            SELECT provider_name 
            FROM contracts 
            WHERE contract_id = ?
        """, payment['contract_id'])
        result = cursor.fetchone()
        if result:
            provider = result[0]
            by_provider[provider].append(payment)
    
    conn.close()
    
    return {
        'by_client': dict(by_client),
        'by_month': dict(by_month),
        'by_provider': dict(by_provider)
    }

def test_insert_payments(missing_payments, actually_insert=False):
    """Test inserting payments with validation"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    results = {
        'valid_payments': [],
        'validation_errors': [],
        'potential_duplicates': [],
        'insert_summary': {}
    }
    
    try:
        # Start transaction
        cursor.execute("BEGIN TRANSACTION")
        
        # Validate each payment
        for payment in missing_payments:
            # Check client/contract exists
            valid, msg = validate_client_contract_exists(conn, 
                                                       payment['client_id'], 
                                                       payment['contract_id'])
            if not valid:
                results['validation_errors'].append({
                    'payment': payment,
                    'error': msg
                })
                continue
            
            results['valid_payments'].append(payment)
        
        # Check for potential duplicates
        if results['valid_payments']:
            dupes = check_duplicate_payments(conn, results['valid_payments'])
            results['potential_duplicates'] = dupes
        
        # Prepare insert statement
        insert_sql = """
            INSERT INTO payments (
                contract_id, client_id, received_date, total_assets,
                actual_fee, method, notes, applied_period_type,
                applied_period, applied_year
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        # Test insert (or actually insert if requested)
        inserted_count = 0
        for payment in results['valid_payments']:
            if payment not in [d['new_payment'] for d in results['potential_duplicates']]:
                cursor.execute(insert_sql, 
                    payment['contract_id'],
                    payment['client_id'],
                    payment['received_date'],
                    payment.get('total_assets'),
                    payment['actual_fee'],
                    payment.get('method', 'Check'),
                    payment.get('notes'),
                    payment.get('applied_period_type'),
                    payment.get('applied_period'),
                    payment.get('applied_year')
                )
                inserted_count += 1
        
        results['insert_summary'] = {
            'total_missing': len(missing_payments),
            'valid_for_insert': len(results['valid_payments']),
            'validation_errors': len(results['validation_errors']),
            'potential_duplicates': len(results['potential_duplicates']),
            'would_insert': inserted_count
        }
        
        if actually_insert:
            cursor.execute("COMMIT")
            print("COMMITTED TRANSACTION - Payments inserted!")
        else:
            cursor.execute("ROLLBACK")
            print("ROLLED BACK - This was just a test")
            
    except Exception as e:
        cursor.execute("ROLLBACK")
        print(f"Error occurred: {e}")
        raise
    finally:
        conn.close()
    
    return results

def main():
    print("Loading reconciliation results...")
    results = load_reconciliation_results()
    missing_payments = results['missing_payments']
    
    print(f"\nFound {len(missing_payments)} missing payments to analyze")
    
    # Analyze patterns
    print("\nAnalyzing payment patterns...")
    analysis = analyze_missing_payments(missing_payments)
    
    # Show summary by provider
    print("\n=== MISSING PAYMENTS BY PROVIDER ===")
    for provider, payments in analysis['by_provider'].items():
        total = sum(p['actual_fee'] for p in payments)
        print(f"{provider}: {len(payments)} payments, ${total:,.2f} total")
    
    # Show summary by month
    print("\n=== MISSING PAYMENTS BY MONTH ===")
    for month in sorted(analysis['by_month'].keys()):
        payments = analysis['by_month'][month]
        total = sum(p['actual_fee'] for p in payments)
        print(f"{month}: {len(payments)} payments, ${total:,.2f} total")
    
    # Test insert
    print("\n=== TESTING INSERT (NO ACTUAL CHANGES) ===")
    test_results = test_insert_payments(missing_payments, actually_insert=True)
    
    print(f"\nInsert Test Summary:")
    for key, value in test_results['insert_summary'].items():
        print(f"  {key}: {value}")
    
    # Show validation errors if any
    if test_results['validation_errors']:
        print(f"\n⚠️  VALIDATION ERRORS ({len(test_results['validation_errors'])})")
        for error in test_results['validation_errors'][:5]:
            print(f"  Client {error['payment']['client_id']}: {error['error']}")
    
    # Show potential duplicates if any
    if test_results['potential_duplicates']:
        print(f"\n⚠️  POTENTIAL DUPLICATES ({len(test_results['potential_duplicates'])})")
        for dupe in test_results['potential_duplicates'][:5]:
            new_p = dupe['new_payment']
            print(f"\n  New: Client {new_p['client_id']}, ${new_p['actual_fee']} on {new_p['received_date']}")
            for existing in dupe['existing']:
                print(f"  Existing: Payment #{existing['payment_id']}, ${existing['amount']} on {existing['date']}")
    
    # Calculate total money
    total_missing = sum(p['actual_fee'] for p in missing_payments)
    print(f"\n💰 Total missing payment value: ${total_missing:,.2f}")
    
    # Ask user if they want to proceed
    print("\n" + "="*50)
    print("This was a TEST RUN - no data was changed")
    print("Review the results above carefully")
    print("\nTo actually insert these payments, you would need to:")
    print("1. Review any validation errors or potential duplicates")
    print("2. Run the script with actually_insert=True")
    print("="*50)

if __name__ == "__main__":
    main()