# backend/test_periods.py
"""Test script to debug period dropdown issue"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import db
from datetime import date

def test_payment_periods_table():
    """Test if payment_periods table has data"""
    print("Testing payment_periods table...")
    
    with db.get_cursor() as cursor:
        # Count total periods
        cursor.execute("SELECT COUNT(*) as count FROM payment_periods")
        result = cursor.fetchone()
        print(f"Total periods in table: {result.count}")
        
        # Check monthly periods
        cursor.execute("SELECT COUNT(*) as count FROM payment_periods WHERE period_type = 'monthly'")
        result = cursor.fetchone()
        print(f"Monthly periods: {result.count}")
        
        # Check quarterly periods
        cursor.execute("SELECT COUNT(*) as count FROM payment_periods WHERE period_type = 'quarterly'")
        result = cursor.fetchone()
        print(f"Quarterly periods: {result.count}")
        
        # Show sample data
        cursor.execute("""
            SELECT TOP 10 * FROM payment_periods 
            ORDER BY year DESC, period DESC
        """)
        print("\nSample periods:")
        for row in cursor.fetchall():
            print(f"  {row.period_type}: {row.period_name} (year={row.year}, period={row.period})")

def test_period_query():
    """Test the actual period query logic"""
    print("\n\nTesting period query logic...")
    
    # Test parameters
    payment_schedule = 'monthly'
    earliest_year = 2023
    earliest_period = 1
    current_year = 2025
    current_period = 6  # June 2025 (if today is July 2025)
    
    print(f"Test params: schedule={payment_schedule}, earliest={earliest_year}-{earliest_period}, current={current_year}-{current_period}")
    
    with db.get_cursor() as cursor:
        # Test the fixed query
        cursor.execute("""
            SELECT 
                pp.period_type,
                pp.year,
                pp.period,
                pp.period_name,
                pp.start_date,
                pp.end_date
            FROM payment_periods pp
            WHERE 
                pp.period_type = ? AND
                (
                    -- Case 1: Years between earliest and current (exclusive)
                    (pp.year > ? AND pp.year < ?) OR
                    -- Case 2: Earliest year - from earliest_period onwards
                    (pp.year = ? AND pp.period >= ? AND ? < ?) OR
                    -- Case 3: Current year - up to current_period
                    (pp.year = ? AND pp.period <= ? AND ? < ?) OR
                    -- Case 4: Same year - between earliest_period and current_period
                    (pp.year = ? AND pp.year = ? AND pp.period >= ? AND pp.period <= ?)
                )
            ORDER BY pp.year DESC, pp.period DESC
        """, (payment_schedule, 
              earliest_year, current_year,  # Case 1
              earliest_year, earliest_period, earliest_year, current_year,  # Case 2
              current_year, current_period, earliest_year, current_year,  # Case 3
              earliest_year, current_year, earliest_period, current_period))  # Case 4
        
        rows = cursor.fetchall()
        print(f"\nQuery returned {len(rows)} periods")
        
        if rows:
            print("\nFirst 10 periods:")
            for i, row in enumerate(rows[:10]):
                print(f"  {row.period_name} (year={row.year}, period={row.period})")

def test_current_period_calculation():
    """Test how current period is calculated"""
    print("\n\nTesting current period calculation...")
    
    with db.get_cursor() as cursor:
        # Test monthly
        cursor.execute("""
            SELECT 
                CASE WHEN MONTH(GETDATE()) = 1 THEN 12 ELSE MONTH(GETDATE()) - 1 END AS current_period,
                CASE WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1 ELSE YEAR(GETDATE()) END AS current_year,
                GETDATE() as today
        """)
        result = cursor.fetchone()
        print(f"Monthly: Today={result.today}, Current period={result.current_year}-{result.current_period}")
        
        # Test quarterly
        cursor.execute("""
            SELECT 
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN 4 ELSE DATEPART(QUARTER, GETDATE()) - 1 END AS current_period,
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN YEAR(GETDATE()) - 1 ELSE YEAR(GETDATE()) END AS current_year,
                DATEPART(QUARTER, GETDATE()) as current_quarter
        """)
        result = cursor.fetchone()
        print(f"Quarterly: Current quarter={result.current_quarter}, Current period={result.current_year}-{result.current_period}")

if __name__ == "__main__":
    test_payment_periods_table()
    test_period_query()
    test_current_period_calculation()