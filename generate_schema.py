import pyodbc
from datetime import datetime
import os

class DatabaseSchemaExtractor:
    def __init__(self, connection_string):
        self.conn = pyodbc.connect(connection_string)
        self.schema_text = []
        
    def extract_all(self, output_file='database_schema.txt'):
        """Extract all database objects and save to file"""
        print("📋 Extracting database schema...")
        
        self.add_header()
        self.extract_tables()
        self.extract_views()
        self.extract_indexes()
        self.extract_triggers()
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(self.schema_text))
            
        print(f"✅ Schema saved to: {output_file}")
        
    def add_header(self):
        """Add header information"""
        self.schema_text.extend([
            "-- =====================================================",
            "-- HohimerPro 401k Database Schema",
            f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "-- =====================================================",
            "",
            "-- This file contains the complete database schema including:",
            "-- • Tables with all columns, data types, and constraints",
            "-- • Views for reporting and data access", 
            "-- • Indexes for query optimization",
            "-- • Triggers for automated data maintenance",
            "",
            "-- =====================================================",
            ""
        ])
        
    def extract_tables(self):
        """Extract all table definitions"""
        self.schema_text.extend([
            "-- =====================================================",
            "-- TABLES",
            "-- =====================================================",
            ""
        ])
        
        # Get all user tables
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            AND TABLE_NAME NOT LIKE 'sys%'
            ORDER BY TABLE_NAME
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        for table in tables:
            print(f"  Extracting table: {table}")
            self.schema_text.append(f"-- Table: {table}")
            self.schema_text.append(f"CREATE TABLE [{table}] (")
            
            # Get columns
            cursor.execute(f"""
                SELECT 
                    c.COLUMN_NAME,
                    c.DATA_TYPE,
                    c.CHARACTER_MAXIMUM_LENGTH,
                    c.NUMERIC_PRECISION,
                    c.NUMERIC_SCALE,
                    c.IS_NULLABLE,
                    c.COLUMN_DEFAULT,
                    cc.CONSTRAINT_NAME,
                    cc.CONSTRAINT_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN (
                    SELECT cu.COLUMN_NAME, tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu
                        ON tc.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
                    WHERE tc.TABLE_NAME = '{table}'
                ) cc ON c.COLUMN_NAME = cc.COLUMN_NAME
                WHERE c.TABLE_NAME = '{table}'
                ORDER BY c.ORDINAL_POSITION
            """)
            
            columns = cursor.fetchall()
            column_defs = []
            
            for col in columns:
                col_def = f"    [{col[0]}] {self._format_data_type(col)}"
                
                # Add NOT NULL
                if col[5] == 'NO':
                    col_def += " NOT NULL"
                    
                # Add DEFAULT
                if col[6]:
                    col_def += f" DEFAULT {col[6]}"
                    
                # Add PRIMARY KEY inline if single column PK
                if col[8] == 'PRIMARY KEY':
                    col_def += " PRIMARY KEY"
                    
                column_defs.append(col_def)
            
            # Get multi-column constraints
            cursor.execute(f"""
                SELECT 
                    tc.CONSTRAINT_NAME,
                    tc.CONSTRAINT_TYPE,
                    STRING_AGG(cu.COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY cu.COLUMN_NAME) as COLUMNS
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu
                    ON tc.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
                WHERE tc.TABLE_NAME = '{table}'
                    AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY', 'CHECK')
                GROUP BY tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE
                HAVING COUNT(*) > 1 OR tc.CONSTRAINT_TYPE != 'PRIMARY KEY'
            """)
            
            constraints = cursor.fetchall()
            
            for constraint in constraints:
                if constraint[1] == 'PRIMARY KEY':
                    column_defs.append(f"    CONSTRAINT [{constraint[0]}] PRIMARY KEY ({constraint[2]})")
                elif constraint[1] == 'CHECK':
                    # Get check constraint definition
                    cursor.execute(f"""
                        SELECT cc.DEFINITION 
                        FROM sys.check_constraints cc
                        JOIN sys.tables t ON cc.parent_object_id = t.object_id
                        WHERE t.name = '{table}' AND cc.name = '{constraint[0]}'
                    """)
                    check_def = cursor.fetchone()
                    if check_def:
                        column_defs.append(f"    CONSTRAINT [{constraint[0]}] CHECK {check_def[0]}")
            
            self.schema_text.append(',\n'.join(column_defs))
            self.schema_text.append(");")
            self.schema_text.append("")
            
            # Get foreign keys
            cursor.execute(f"""
                SELECT 
                    fk.name AS FK_NAME,
                    tp.name AS PARENT_TABLE,
                    cp.name AS PARENT_COLUMN,
                    tr.name AS REFERENCED_TABLE,
                    cr.name AS REFERENCED_COLUMN
                FROM sys.foreign_keys fk
                JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
                JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
                JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
                JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
                WHERE tp.name = '{table}'
            """)
            
            foreign_keys = cursor.fetchall()
            for fk in foreign_keys:
                self.schema_text.append(f"ALTER TABLE [{table}] ADD CONSTRAINT [{fk[0]}]")
                self.schema_text.append(f"    FOREIGN KEY ([{fk[2]}]) REFERENCES [{fk[3]}]([{fk[4]}]);")
                self.schema_text.append("")
        
    def extract_views(self):
        """Extract all view definitions"""
        self.schema_text.extend([
            "",
            "-- =====================================================",
            "-- VIEWS",
            "-- =====================================================",
            ""
        ])
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                v.name AS VIEW_NAME,
                m.definition AS VIEW_DEFINITION
            FROM sys.views v
            JOIN sys.sql_modules m ON v.object_id = m.object_id
            WHERE v.is_ms_shipped = 0
            ORDER BY v.name
        """)
        
        views = cursor.fetchall()
        
        for view in views:
            print(f"  Extracting view: {view[0]}")
            self.schema_text.append(f"-- View: {view[0]}")
            self.schema_text.append(view[1].strip())
            self.schema_text.append("")
            
    def extract_indexes(self):
        """Extract all index definitions"""
        self.schema_text.extend([
            "",
            "-- =====================================================",
            "-- INDEXES",
            "-- =====================================================",
            ""
        ])
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                i.name AS INDEX_NAME,
                t.name AS TABLE_NAME,
                i.type_desc,
                i.is_unique,
                i.is_primary_key,
                STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS INDEX_COLUMNS,
                STRING_AGG(CASE WHEN ic.is_included_column = 1 THEN c.name END, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS INCLUDED_COLUMNS
            FROM sys.indexes i
            JOIN sys.tables t ON i.object_id = t.object_id
            JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE i.is_primary_key = 0 
                AND i.type != 0
                AND t.is_ms_shipped = 0
            GROUP BY i.name, t.name, i.type_desc, i.is_unique, i.is_primary_key
            ORDER BY t.name, i.name
        """)
        
        indexes = cursor.fetchall()
        
        for idx in indexes:
            if idx[0]:  # Skip unnamed indexes
                print(f"  Extracting index: {idx[0]}")
                create_stmt = "CREATE "
                if idx[3]:  # is_unique
                    create_stmt += "UNIQUE "
                create_stmt += f"{idx[2]} INDEX [{idx[0]}]"
                create_stmt += f" ON [{idx[1]}] ({idx[5]})"
                
                if idx[6]:  # has included columns
                    create_stmt += f" INCLUDE ({idx[6]})"
                    
                create_stmt += ";"
                
                self.schema_text.append(create_stmt)
                self.schema_text.append("")
                
    def extract_triggers(self):
        """Extract all trigger definitions"""
        self.schema_text.extend([
            "",
            "-- =====================================================",
            "-- TRIGGERS",
            "-- =====================================================",
            ""
        ])
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                t.name AS TRIGGER_NAME,
                p.name AS TABLE_NAME,
                m.definition AS TRIGGER_DEFINITION
            FROM sys.triggers t
            JOIN sys.tables p ON t.parent_id = p.object_id
            JOIN sys.sql_modules m ON t.object_id = m.object_id
            WHERE t.is_ms_shipped = 0
            ORDER BY p.name, t.name
        """)
        
        triggers = cursor.fetchall()
        
        for trigger in triggers:
            print(f"  Extracting trigger: {trigger[0]}")
            self.schema_text.append(f"-- Trigger: {trigger[0]} on {trigger[1]}")
            self.schema_text.append(trigger[2].strip())
            self.schema_text.append("GO")
            self.schema_text.append("")
            
    def _format_data_type(self, col_info):
        """Format data type with precision/length"""
        data_type = col_info[1]
        
        if col_info[2]:  # character length
            if col_info[2] == -1:
                return f"{data_type}(MAX)"
            else:
                return f"{data_type}({col_info[2]})"
        elif col_info[3]:  # numeric precision
            if col_info[4]:  # scale
                return f"{data_type}({col_info[3]},{col_info[4]})"
            else:
                return f"{data_type}({col_info[3]})"
        else:
            return data_type
            
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
    
    extractor = DatabaseSchemaExtractor(connection_string)
    extractor.extract_all('HohimerPro_401k_Schema.txt')
    extractor.close()
    
    print("\n📄 Schema extraction complete!")
    print("   File contains all tables, views, indexes, and triggers")