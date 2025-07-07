# backend/populate_periods.py
"""Script to populate payment_periods table with monthly and quarterly periods"""

from datetime import date, timedelta
from calendar import monthrange
from app.database import db

def populate_periods():
    """Populate payment_periods table for years 2020-2026"""
    
    with db.get_cursor() as cursor:
        # Clear existing data
        cursor.execute("DELETE FROM payment_periods")
        
        # Generate periods for years 2020-2026
        for year in range(2020, 2027):
            # Monthly periods
            for month in range(1, 13):
                period_name = date(year, month, 1).strftime("%B %Y")
                start_date = date(year, month, 1)
                
                # Calculate end date (last day of month)
                last_day = monthrange(year, month)[1]
                end_date = date(year, month, last_day)
                
                # Check if current
                today = date.today()
                is_current = (year == today.year and month == today.month)
                
                cursor.execute("""
                    INSERT INTO payment_periods 
                    (period_type, year, period, period_name, start_date, end_date, is_current)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, ('monthly', year, month, period_name, start_date, end_date, is_current))
            
            # Quarterly periods
            for quarter in range(1, 5):
                period_name = f"Q{quarter} {year}"
                
                # Calculate quarter dates
                quarter_months = {
                    1: (1, 3),   # Q1: Jan-Mar
                    2: (4, 6),   # Q2: Apr-Jun
                    3: (7, 9),   # Q3: Jul-Sep
                    4: (10, 12)  # Q4: Oct-Dec
                }
                
                start_month, end_month = quarter_months[quarter]
                start_date = date(year, start_month, 1)
                
                # Last day of quarter
                last_day = monthrange(year, end_month)[1]
                end_date = date(year, end_month, last_day)
                
                # Check if current quarter
                today = date.today()
                current_quarter = (today.month - 1) // 3 + 1
                is_current = (year == today.year and quarter == current_quarter)
                
                cursor.execute("""
                    INSERT INTO payment_periods 
                    (period_type, year, period, period_name, start_date, end_date, is_current)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, ('quarterly', year, quarter, period_name, start_date, end_date, is_current))
        
        cursor.connection.commit()
        print("Successfully populated payment_periods table")
        
        # Verify the data
        cursor.execute("SELECT COUNT(*) as count FROM payment_periods WHERE period_type = 'monthly'")
        monthly_count = cursor.fetchone().count
        
        cursor.execute("SELECT COUNT(*) as count FROM payment_periods WHERE period_type = 'quarterly'")
        quarterly_count = cursor.fetchone().count
        
        print(f"Added {monthly_count} monthly periods and {quarterly_count} quarterly periods")

if __name__ == "__main__":
    populate_periods()