import pyodbc
import pandas as pd
from datetime import datetime
import os
from typing import Dict, List, Tuple

class DatabaseMigrationAnalyzer:
    def __init__(self, connection_string):
        self.conn = pyodbc.connect(connection_string)
        self.issues = []
        
    def analyze_all(self):
        """Run all analysis checks"""
        print("🔍 Starting Database Migration Analysis...\n")
        
        self.check_date_conversions()
        self.check_period_constraints()
        self.check_dead_columns()
        self.check_existing_objects()
        self.analyze_data_patterns()
        self.generate_report()
        
    def check_date_conversions(self):
        """Check all date columns for invalid values"""
        print("📅 Checking date column conversions...")
        
        date_columns = [
            ('clients', 'ima_signed_date'),
            ('contracts', 'contract_start_date'),
            ('payments', 'received_date'),
            ('client_metrics', 'last_payment_date'),
            ('client_metrics', 'last_updated'),
            ('client_metrics', 'next_payment_due'),
            ('quarterly_summaries', 'last_updated'),
            ('yearly_summaries', 'last_updated')
        ]
        
        for table, column in date_columns:
            query = f"""
            SELECT COUNT(*) as total_rows,
                   COUNT({column}) as non_null_dates,
                   COUNT(CASE WHEN {column} IS NOT NULL AND TRY_CONVERT(DATE, {column}) IS NULL THEN 1 END) as invalid_dates,
                   MIN(LEN({column})) as min_length,
                   MAX(LEN({column})) as max_length
            FROM {table}
            """
            
            result = pd.read_sql(query, self.conn)
            row = result.iloc[0]
            
            if row['invalid_dates'] > 0:
                # Get sample invalid dates
                sample_query = f"""
                SELECT TOP 10 {column} as date_value, 
                       {table.rstrip('s')}_id as record_id
                FROM {table}
                WHERE {column} IS NOT NULL 
                  AND TRY_CONVERT(DATE, {column}) IS NULL
                """
                samples = pd.read_sql(sample_query, self.conn)
                
                self.issues.append({
                    'type': 'INVALID_DATE',
                    'severity': 'HIGH',
                    'table': table,
                    'column': column,
                    'count': row['invalid_dates'],
                    'samples': samples.to_dict('records')
                })
            
            # Check for unusual formats even if convertible
            format_query = f"""
            SELECT TOP 20 DISTINCT {column} as date_value,
                   COUNT(*) as occurrences
            FROM {table}
            WHERE {column} IS NOT NULL
            GROUP BY {column}
            ORDER BY COUNT(*) DESC
            """
            formats = pd.read_sql(format_query, self.conn)
            
            print(f"  ✓ {table}.{column}: {row['non_null_dates']} dates, {row['invalid_dates']} invalid")
            if row['invalid_dates'] > 0:
                print(f"    ⚠️  Found {row['invalid_dates']} invalid date values!")
                
    def check_period_constraints(self):
        """Check if applied_period values are within valid ranges"""
        print("\n🔢 Checking period constraints...")
        
        query = """
        SELECT 
            applied_period_type,
            MIN(applied_period) as min_period,
            MAX(applied_period) as max_period,
            COUNT(*) as record_count,
            COUNT(CASE 
                WHEN (applied_period_type = 'monthly' AND applied_period NOT BETWEEN 1 AND 12)
                  OR (applied_period_type = 'quarterly' AND applied_period NOT BETWEEN 1 AND 4)
                THEN 1 
            END) as invalid_periods
        FROM payments
        WHERE valid_to IS NULL
        GROUP BY applied_period_type
        """
        
        result = pd.read_sql(query, self.conn)
        
        for _, row in result.iterrows():
            if row['invalid_periods'] > 0:
                # Get details of invalid periods
                detail_query = f"""
                SELECT payment_id, applied_period, applied_year
                FROM payments
                WHERE applied_period_type = '{row['applied_period_type']}'
                  AND valid_to IS NULL
                  AND (
                    (applied_period_type = 'monthly' AND applied_period NOT BETWEEN 1 AND 12)
                    OR (applied_period_type = 'quarterly' AND applied_period NOT BETWEEN 1 AND 4)
                  )
                """
                invalid_details = pd.read_sql(detail_query, self.conn)
                
                self.issues.append({
                    'type': 'INVALID_PERIOD',
                    'severity': 'HIGH',
                    'period_type': row['applied_period_type'],
                    'count': row['invalid_periods'],
                    'details': invalid_details.to_dict('records')
                })
            
            print(f"  ✓ {row['applied_period_type']}: periods range from {row['min_period']} to {row['max_period']}")
            if row['invalid_periods'] > 0:
                print(f"    ⚠️  Found {row['invalid_periods']} invalid period values!")
                
    def check_dead_columns(self):
        """Analyze the columns we're planning to drop"""
        print("\n🗑️  Checking columns to be dropped...")
        
        query = """
        SELECT 
            COUNT(*) as total_rows,
            COUNT(last_payment_quarter) as quarter_non_null,
            COUNT(last_payment_year) as year_non_null,
            COUNT(DISTINCT last_payment_quarter) as unique_quarters,
            COUNT(DISTINCT last_payment_year) as unique_years
        FROM client_metrics
        """
        
        result = pd.read_sql(query, self.conn)
        row = result.iloc[0]
        
        print(f"  ✓ client_metrics.last_payment_quarter: {row['quarter_non_null']} non-null values")
        print(f"  ✓ client_metrics.last_payment_year: {row['year_non_null']} non-null values")
        
        if row['quarter_non_null'] > 0 or row['year_non_null'] > 0:
            self.issues.append({
                'type': 'DATA_IN_DROPPED_COLUMNS',
                'severity': 'LOW',
                'message': f"Columns contain data: quarter={row['quarter_non_null']}, year={row['year_non_null']} rows",
                'recommendation': "Data will be lost but appears unused by application"
            })
            
    def check_existing_objects(self):
        """Check for existing database objects that might conflict"""
        print("\n🔧 Checking existing database objects...")
        
        # Check for existing indexes
        index_query = """
        SELECT 
            i.name as index_name,
            t.name as table_name,
            STRING_AGG(c.name, ', ') as columns
        FROM sys.indexes i
        JOIN sys.tables t ON i.object_id = t.object_id
        JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE t.name = 'payments' 
          AND i.name LIKE '%idx_payments%'
        GROUP BY i.name, t.name
        """
        
        existing_indexes = pd.read_sql(index_query, self.conn)
        if not existing_indexes.empty:
            print("  ⚠️  Found existing payment indexes:")
            for _, idx in existing_indexes.iterrows():
                print(f"    - {idx['index_name']} on columns: {idx['columns']}")
                
        # Check for existing views
        view_query = """
        SELECT name 
        FROM sys.views 
        WHERE name IN ('payment_variance_view', 'clients_by_provider_view')
        """
        
        existing_views = pd.read_sql(view_query, self.conn)
        if not existing_views.empty:
            self.issues.append({
                'type': 'EXISTING_VIEWS',
                'severity': 'MEDIUM',
                'views': existing_views['name'].tolist(),
                'recommendation': "Drop existing views before creating new ones"
            })
            
        # Check for table existence
        table_query = """
        SELECT name 
        FROM sys.tables 
        WHERE name = 'payment_periods'
        """
        
        existing_table = pd.read_sql(table_query, self.conn)
        if not existing_table.empty:
            self.issues.append({
                'type': 'EXISTING_TABLE',
                'severity': 'HIGH',
                'table': 'payment_periods',
                'recommendation': "Table already exists - drop or rename before creation"
            })
            
    def analyze_data_patterns(self):
        """Analyze data patterns that might affect migration"""
        print("\n📊 Analyzing data patterns...")
        
        # Check year ranges for payment_periods table
        year_query = """
        SELECT 
            MIN(applied_year) as min_year,
            MAX(applied_year) as max_year,
            COUNT(DISTINCT applied_year) as unique_years
        FROM payments
        WHERE valid_to IS NULL AND applied_year IS NOT NULL
        """
        
        year_result = pd.read_sql(year_query, self.conn)
        row = year_result.iloc[0]
        
        print(f"  ✓ Payment years range from {row['min_year']} to {row['max_year']}")
        
        if row['min_year'] and row['min_year'] < 2015:
            self.issues.append({
                'type': 'DATA_RANGE',
                'severity': 'MEDIUM',
                'message': f"Payments exist before 2015 (earliest: {row['min_year']})",
                'recommendation': "Consider extending payment_periods table back further"
            })
            
        # Check for NULL expected_fee prevalence
        null_fee_query = """
        SELECT 
            COUNT(*) as total_payments,
            COUNT(expected_fee) as has_expected_fee,
            COUNT(*) - COUNT(expected_fee) as missing_expected_fee
        FROM payments
        WHERE valid_to IS NULL
        """
        
        fee_result = pd.read_sql(null_fee_query, self.conn)
        row = fee_result.iloc[0]
        
        if row['missing_expected_fee'] > 0:
            pct = (row['missing_expected_fee'] / row['total_payments']) * 100
            print(f"  ⚠️  {row['missing_expected_fee']} payments ({pct:.1f}%) have NULL expected_fee")
            
    def generate_report(self):
        """Generate final migration readiness report"""
        print("\n" + "="*60)
        print("📋 MIGRATION READINESS REPORT")
        print("="*60)
        
        if not self.issues:
            print("\n✅ No blocking issues found! Database is ready for migration.")
            print("\nRecommended order of execution:")
            print("1. Create payment_periods table and populate it")
            print("2. Fix any date issues if found")
            print("3. Convert date columns to DATE type")
            print("4. Add CHECK constraints")
            print("5. Drop unused columns")
            print("6. Create new views")
            print("7. Add new index")
        else:
            print(f"\n⚠️  Found {len(self.issues)} issues to address:\n")
            
            high_priority = [i for i in self.issues if i['severity'] == 'HIGH']
            medium_priority = [i for i in self.issues if i['severity'] == 'MEDIUM']
            low_priority = [i for i in self.issues if i['severity'] == 'LOW']
            
            if high_priority:
                print("🔴 HIGH PRIORITY ISSUES:")
                for issue in high_priority:
                    self._print_issue(issue)
                    
            if medium_priority:
                print("\n🟡 MEDIUM PRIORITY ISSUES:")
                for issue in medium_priority:
                    self._print_issue(issue)
                    
            if low_priority:
                print("\n🟢 LOW PRIORITY ISSUES:")
                for issue in low_priority:
                    self._print_issue(issue)
                    
        print("\n" + "="*60)
        
    def _print_issue(self, issue):
        """Pretty print an issue"""
        print(f"\n  Issue: {issue['type']}")
        if issue['type'] == 'INVALID_DATE':
            print(f"  Table: {issue['table']}.{issue['column']}")
            print(f"  Count: {issue['count']} invalid dates")
            if issue['samples']:
                print("  Samples:")
                for sample in issue['samples'][:3]:
                    print(f"    - '{sample['date_value']}' (ID: {sample['record_id']})")
        elif issue['type'] == 'INVALID_PERIOD':
            print(f"  Period Type: {issue['period_type']}")
            print(f"  Count: {issue['count']} invalid periods")
        else:
            for key, value in issue.items():
                if key not in ['type', 'severity']:
                    print(f"  {key}: {value}")
                    
    def close(self):
        """Close database connection"""
        self.conn.close()


# Usage
if __name__ == "__main__":
    connection_string = (
        "Driver={ODBC Driver 18 for SQL Server};"
        "Server=tcp:hohimerpro-db-server.database.windows.net,1433;"
        "Database=HohimerPro-401k;"
        "Uid=CloudSAddb51659;"
        "Pwd=Prunes27$;"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )
    
    analyzer = DatabaseMigrationAnalyzer(connection_string)
    analyzer.analyze_all()
    analyzer.close()