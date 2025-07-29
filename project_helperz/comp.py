import json
import pyodbc
from datetime import datetime, timedelta
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

def load_json_payments(filepath):
    """Load payments from JSON file"""
    with open(filepath, 'r') as f:
        return json.load(f)

def load_db_payments(conn, days_back=400):
    """Load recent payments from database"""
    query = """
    SELECT contract_id, client_id, received_date, total_assets, 
           actual_fee, notes, applied_period_type, applied_period, applied_year
    FROM payments
    WHERE received_date >= DATEADD(day, -?, GETDATE())
    ORDER BY received_date DESC
    """
    cursor = conn.cursor()
    cursor.execute(query, days_back)
    
    payments = []
    for row in cursor.fetchall():
        payments.append({
            'contract_id': row[0],
            'client_id': row[1],
            'received_date': row[2].strftime('%Y-%m-%d') if row[2] else None,
            'total_assets': row[3],
            'actual_fee': float(row[4]) if row[4] else None,
            'notes': row[5],
            'applied_period_type': row[6],
            'applied_period': row[7],
            'applied_year': row[8]
        })
    return payments

def extract_check_number(notes):
    """Extract check number from notes field"""
    if not notes:
        return None
    # Look for patterns like "Check #123456" or "CHK#123456"
    import re
    match = re.search(r'(?:Check|CHK|chk)\s*#?\s*(\d+)', notes, re.I)
    return match.group(1) if match else None

def find_match(json_payment, db_payments, date_tolerance_days=3):
    """Find potential matches for a JSON payment in database"""
    matches = []
    
    json_date = datetime.strptime(json_payment['received_date'], '%Y-%m-%d')
    json_check = extract_check_number(json_payment.get('notes', ''))
    
    for db_payment in db_payments:
        # Must match client and contract
        if (db_payment['client_id'] != json_payment['client_id'] or 
            db_payment['contract_id'] != json_payment['contract_id']):
            continue
            
        # Check amount match
        if abs((db_payment['actual_fee'] or 0) - json_payment['actual_fee']) > 0.01:
            continue
            
        # Check date within tolerance
        if db_payment['received_date']:
            db_date = datetime.strptime(db_payment['received_date'], '%Y-%m-%d')
            if abs((json_date - db_date).days) <= date_tolerance_days:
                # Calculate match score
                score = 100
                
                # Exact date match is best
                if json_date == db_date:
                    score += 50
                else:
                    score -= abs((json_date - db_date).days) * 10
                    
                # Check number match is strong signal
                db_check = extract_check_number(db_payment.get('notes', ''))
                if json_check and db_check and json_check == db_check:
                    score += 100
                    
                # Period match
                if (db_payment['applied_period'] == json_payment['applied_period'] and
                    db_payment['applied_year'] == json_payment['applied_year']):
                    score += 30
                    
                matches.append((score, db_payment))
    
    # Return best match if found
    if matches:
        matches.sort(key=lambda x: x[0], reverse=True)
        return matches[0][1]
    return None

def group_by_check(payments):
    """Group payments by check number"""
    check_groups = defaultdict(list)
    for p in payments:
        check_num = extract_check_number(p.get('notes', ''))
        if check_num:
            check_groups[check_num].append(p)
    return check_groups

def main():
    # Load data
    print("Loading data...")
    json_payments = load_json_payments(r"C:\Users\ErikKnudsen\Desktop\ADD_PAYMENTS_JSON.txt")
    
    conn = get_db_connection()
    db_payments = load_db_payments(conn)
    conn.close()
    
    print(f"Loaded {len(json_payments)} JSON payments")
    print(f"Loaded {len(db_payments)} database payments")
    
    # Group by check for multi-client analysis
    json_check_groups = group_by_check(json_payments)
    db_check_groups = group_by_check(db_payments)
    
    # Analyze each JSON payment
    perfect_matches = []
    discrepancies = []
    missing = []
    
    for json_payment in json_payments:
        match = find_match(json_payment, db_payments)
        
        if match:
            # Check for discrepancies
            issues = []
            
            # Date discrepancy
            if match['received_date'] != json_payment['received_date']:
                issues.append(f"Date: DB={match['received_date']} vs JSON={json_payment['received_date']}")
            
            # Assets discrepancy (if both have values)
            if json_payment['total_assets'] and match['total_assets']:
                if abs((match['total_assets'] or 0) - json_payment['total_assets']) > 1:
                    issues.append(f"Assets: DB={match['total_assets']} vs JSON={json_payment['total_assets']}")
            
            # Period discrepancy
            if (match['applied_period'] != json_payment['applied_period'] or
                match['applied_year'] != json_payment['applied_year']):
                issues.append(f"Period: DB={match['applied_year']}-{match['applied_period']} vs JSON={json_payment['applied_year']}-{json_payment['applied_period']}")
            
            if issues:
                discrepancies.append({
                    'json': json_payment,
                    'db': match,
                    'issues': issues
                })
            else:
                perfect_matches.append(json_payment)
        else:
            missing.append(json_payment)
    
    # Report results
    print(f"\n=== RECONCILIATION SUMMARY ===")
    print(f"Perfect matches: {len(perfect_matches)}")
    print(f"Matches with discrepancies: {len(discrepancies)}")
    print(f"Missing from database: {len(missing)}")
    
    # Show missing payments grouped by check
    if missing:
        print(f"\n=== MISSING PAYMENTS ({len(missing)}) ===")
        missing_by_check = group_by_check(missing)
        
        for check_num, payments in missing_by_check.items():
            if check_num and len(payments) > 1:
                print(f"\nCheck #{check_num} (MULTI-CLIENT - {len(payments)} payments):")
                for p in payments:
                    print(f"  Client {p['client_id']}: ${p['actual_fee']:,.2f} on {p['received_date']}")
            else:
                for p in payments:
                    check = check_num or "NO CHECK #"
                    print(f"\nClient {p['client_id']}: ${p['actual_fee']:,.2f} on {p['received_date']} [{check}]")
    
    # Show discrepancies
    if discrepancies:
        print(f"\n=== DISCREPANCIES ({len(discrepancies)}) ===")
        for d in discrepancies[:10]:  # Show first 10
            print(f"\nClient {d['json']['client_id']} - ${d['json']['actual_fee']:,.2f}")
            for issue in d['issues']:
                print(f"  ! {issue}")
    
    # Save detailed results
    results = {
        'summary': {
            'perfect_matches': len(perfect_matches),
            'discrepancies': len(discrepancies),
            'missing': len(missing)
        },
        'missing_payments': missing,
        'discrepancies': [
            {
                'client_id': d['json']['client_id'],
                'amount': d['json']['actual_fee'],
                'issues': d['issues'],
                'json_data': d['json']
            }
            for d in discrepancies
        ]
    }
    
    with open('reconciliation_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\nDetailed results saved to reconciliation_results.json")

if __name__ == "__main__":
    main()