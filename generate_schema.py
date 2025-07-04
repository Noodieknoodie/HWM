import pyodbc
from datetime import datetime

class DatabaseSchemaExtractor:
    def __init__(self, connection_string):
        self.conn = pyodbc.connect(connection_string)
        self.schema_text = []
        
    def extract_all(self, output_file='database_schema.txt'):
        print("📋 Extracting database schema...")
        
        self.add_header()
        self.extract_tables()
        self.extract_views()
        self.extract_indexes()
        self.extract_triggers()
        
        # Remove blank lines
        final_text = '\n'.join(line for line in self.schema_text if line.strip())
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(final_text)
            
        print(f"✅ Schema saved to: {output_file}")
        
    def add_header(self):
        self.schema_text.extend([
            "-- =====================================================",
            f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "-- =====================================================",
            ""
        ])
        
    def extract_tables(self):
        self.schema_text.extend([
            "-- =====================================================",
            "-- TABLES",
            "-- =====================================================",
            ""
        ])
        
        cursor = self.conn.cursor()
        
        # Get all user tables with schema
        cursor.execute("""
            SELECT SCHEMA_NAME(schema_id) as schema_name, name as table_name
            FROM sys.tables 
            WHERE is_ms_shipped = 0
            ORDER BY schema_name, name
        """)
        
        tables = cursor.fetchall()
        
        for schema_name, table_name in tables:
            print(f"  Extracting table: {table_name}")
            self.schema_text.append(f"-- Table: {table_name}")
            self.schema_text.append(f"CREATE TABLE [{schema_name}].[{table_name}] (")
            
            # Get columns separately (no JOIN with constraints to avoid duplicates)
            cursor.execute(f"""
                SELECT 
                    c.name AS column_name,
                    t.name AS data_type,
                    c.max_length,
                    c.precision,
                    c.scale,
                    c.is_nullable,
                    dc.definition AS default_value,
                    c.is_identity
                FROM sys.columns c
                INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
                LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
                WHERE c.object_id = OBJECT_ID('{schema_name}.{table_name}')
                ORDER BY c.column_id
            """)
            
            columns = cursor.fetchall()
            column_defs = []
            
            for col in columns:
                col_def = f"    [{col[0]}] {self._format_data_type(col[1], col[2], col[3], col[4])}"
                
                if col[7]:  # is_identity
                    col_def += " IDENTITY(1,1)"
                    
                if not col[5]:  # is_nullable = 0
                    col_def += " NOT NULL"
                    
                if col[6]:  # default_value
                    col_def += f" DEFAULT {col[6]}"
                    
                column_defs.append(col_def)
            
            # Get primary key as separate constraint
            cursor.execute(f"""
                SELECT 
                    kc.name AS constraint_name,
                    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
                FROM sys.key_constraints kc
                INNER JOIN sys.index_columns ic ON kc.parent_object_id = ic.object_id AND kc.unique_index_id = ic.index_id
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                WHERE kc.parent_object_id = OBJECT_ID('{schema_name}.{table_name}') AND kc.type = 'PK'
                GROUP BY kc.name
            """)
            
            pk = cursor.fetchone()
            if pk:
                column_defs.append(f"    CONSTRAINT [{pk[0]}] PRIMARY KEY ({pk[1]})")
            
            # Get check constraints
            cursor.execute(f"""
                SELECT cc.name, cc.definition
                FROM sys.check_constraints cc
                WHERE cc.parent_object_id = OBJECT_ID('{schema_name}.{table_name}')
            """)
            
            for check in cursor.fetchall():
                column_defs.append(f"    CONSTRAINT [{check[0]}] CHECK {check[1]}")
            
            self.schema_text.append(',\n'.join(column_defs))
            self.schema_text.append(");")
            
            # Get foreign keys with proper grouping
            cursor.execute(f"""
                SELECT 
                    fk.name AS fk_name,
                    STRING_AGG(COL_NAME(fkc.parent_object_id, fkc.parent_column_id), ', ') 
                        WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS parent_columns,
                    SCHEMA_NAME(tr.schema_id) AS ref_schema,
                    tr.name AS ref_table,
                    STRING_AGG(COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id), ', ') 
                        WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ref_columns
                FROM sys.foreign_keys fk
                INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
                INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                WHERE fk.parent_object_id = OBJECT_ID('{schema_name}.{table_name}')
                GROUP BY fk.name, tr.schema_id, tr.name
            """)
            
            for fk in cursor.fetchall():
                self.schema_text.append(f"ALTER TABLE [{schema_name}].[{table_name}] ADD CONSTRAINT [{fk[0]}]")
                self.schema_text.append(f"    FOREIGN KEY ({fk[1]}) REFERENCES [{fk[2]}].[{fk[3]}] ({fk[4]});")
            
            self.schema_text.append("")
        
    def extract_views(self):
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
                SCHEMA_NAME(v.schema_id) AS schema_name,
                v.name AS view_name,
                m.definition AS view_definition
            FROM sys.views v
            JOIN sys.sql_modules m ON v.object_id = m.object_id
            WHERE v.is_ms_shipped = 0
            ORDER BY schema_name, view_name
        """)
        
        for schema_name, view_name, definition in cursor.fetchall():
            print(f"  Extracting view: {view_name}")
            self.schema_text.append(f"-- View: {view_name}")
            self.schema_text.append(definition.strip())
            self.schema_text.append("")
            
    def extract_indexes(self):
        self.schema_text.extend([
            "",
            "-- =====================================================",
            "-- INDEXES",
            "-- =====================================================",
            ""
        ])
        
        cursor = self.conn.cursor()
        
        # Get all indexes first
        cursor.execute("""
            SELECT DISTINCT
                i.name AS index_name,
                SCHEMA_NAME(t.schema_id) AS schema_name,
                t.name AS table_name,
                i.type_desc,
                i.is_unique,
                i.object_id,
                i.index_id
            FROM sys.indexes i
            JOIN sys.tables t ON i.object_id = t.object_id
            WHERE i.is_primary_key = 0 AND i.type != 0 AND t.is_ms_shipped = 0
            ORDER BY schema_name, table_name, index_name
        """)
        
        indexes = cursor.fetchall()
        
        for idx in indexes:
            if idx[0]:  # Skip unnamed indexes
                print(f"  Extracting index: {idx[0]}")
                
                # Get index columns
                cursor.execute(f"""
                    SELECT c.name
                    FROM sys.index_columns ic
                    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                    WHERE ic.object_id = {idx[5]} AND ic.index_id = {idx[6]} AND ic.is_included_column = 0
                    ORDER BY ic.key_ordinal
                """)
                index_cols = [row[0] for row in cursor.fetchall()]
                
                # Get included columns
                cursor.execute(f"""
                    SELECT c.name
                    FROM sys.index_columns ic
                    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                    WHERE ic.object_id = {idx[5]} AND ic.index_id = {idx[6]} AND ic.is_included_column = 1
                    ORDER BY ic.index_column_id
                """)
                included_cols = [row[0] for row in cursor.fetchall()]
                
                stmt = "CREATE "
                if idx[4]:  # is_unique
                    stmt += "UNIQUE "
                stmt += f"{idx[3]} INDEX [{idx[0]}] ON [{idx[1]}].[{idx[2]}] ({', '.join(index_cols)})"
                
                if included_cols:
                    stmt += f" INCLUDE ({', '.join(included_cols)})"
                    
                stmt += ";"
                self.schema_text.append(stmt)
                self.schema_text.append("")
                
    def extract_triggers(self):
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
                t.name AS trigger_name,
                SCHEMA_NAME(p.schema_id) AS schema_name,
                p.name AS table_name,
                m.definition AS trigger_definition
            FROM sys.triggers t
            JOIN sys.tables p ON t.parent_id = p.object_id
            JOIN sys.sql_modules m ON t.object_id = m.object_id
            WHERE t.is_ms_shipped = 0
            ORDER BY schema_name, table_name, trigger_name
        """)
        
        for trigger_name, schema_name, table_name, definition in cursor.fetchall():
            print(f"  Extracting trigger: {trigger_name}")
            self.schema_text.append(f"-- Trigger: {trigger_name} on {table_name}")
            self.schema_text.append(definition.strip())
            self.schema_text.append("GO")
            self.schema_text.append("")
            
    def _format_data_type(self, data_type, max_length, precision, scale):
        """Format data type with precision/length"""
        if data_type in ('varchar', 'nvarchar', 'char', 'nchar', 'varbinary', 'binary'):
            if max_length == -1:
                return f"{data_type}(MAX)"
            elif data_type in ('nvarchar', 'nchar'):
                return f"{data_type}({max_length // 2})"
            else:
                return f"{data_type}({max_length})"
        elif data_type in ('decimal', 'numeric'):
            return f"{data_type}({precision},{scale})"
        elif data_type == 'float' and precision and precision < 53:
            return f"{data_type}({precision})"
        else:
            return data_type
            
    def close(self):
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