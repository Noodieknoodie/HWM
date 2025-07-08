import pyodbc # type: ignore
from datetime import datetime
import math

class DatabaseSchemaExtractor:
    def __init__(self, connection_string):
        self.conn = pyodbc.connect(connection_string)
        self.schema_text = []
        
    def extract_all(self, output_file='database_schema_ai_enhanced.txt'):
        print("📋 Extracting enhanced database schema for AI analysis...")
        
        self.add_header()
        self.extract_tables()
        self.extract_views()
        self.extract_indexes()
        self.extract_triggers()
        
        # Remove excessive blank lines
        cleaned_lines = []
        for i, line in enumerate(self.schema_text):
            if line.strip() or (i > 0 and self.schema_text[i-1].strip()):
                cleaned_lines.append(line)
        final_text = '\n'.join(cleaned_lines)
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(final_text)
            
        print(f"✅ Enhanced schema saved to: {output_file}")
        
    def add_header(self):
        self.schema_text.extend([
            "-- =====================================================",
            f"-- AI-Enhanced Database Schema",
            f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "-- Purpose: Provide comprehensive schema + data insights for AI coding assistants",
            "-- =====================================================",
            ""
        ])
        
    def extract_tables(self):
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
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM [{schema_name}].[{table_name}]")
            row_count = cursor.fetchone()[0]
            
            self.schema_text.append(f"-- === Table: {table_name} === --")
            self.schema_text.append(f"-- Schema: {schema_name}")
            self.schema_text.append(f"-- Total Rows: {row_count:,}")
            self.schema_text.append("")
            
            # Table structure
            self.schema_text.append(f"CREATE TABLE [{schema_name}].[{table_name}] (")
            
            # Get columns and null stats
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
            column_names = []
            
            for col in columns:
                col_def = f"    [{col[0]}] {self._format_data_type(col[1], col[2], col[3], col[4])}"
                column_names.append(col[0])
                
                if col[7]:  # is_identity
                    col_def += " IDENTITY(1,1)"
                    
                if not col[5]:  # is_nullable = 0
                    col_def += " NOT NULL"
                    
                if col[6]:  # default_value
                    col_def += f" DEFAULT {col[6]}"
                    
                column_defs.append(col_def)
            
            # Get primary key
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
            
            self.schema_text.append(',\n'.join(column_defs))
            self.schema_text.append(");")
            self.schema_text.append("")
            
            # Get foreign keys
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
            
            fks = cursor.fetchall()
            if fks:
                self.schema_text.append("-- Foreign Keys:")
                for fk in fks:
                    self.schema_text.append(f"-- FK: {fk[0]} ({fk[1]}) -> {fk[3]} ({fk[4]})")
                self.schema_text.append("")
            
            # Get null statistics
            if row_count > 0:
                self.schema_text.append("-- Column Statistics:")
                for col_name in column_names:
                    try:
                        cursor.execute(f"""
                            SELECT 
                                COUNT(*) - COUNT([{col_name}]) as null_count,
                                COUNT(DISTINCT [{col_name}]) as distinct_count
                            FROM [{schema_name}].[{table_name}]
                        """)
                        null_count, distinct_count = cursor.fetchone()
                        null_pct = (null_count / row_count * 100) if row_count > 0 else 0
                        self.schema_text.append(f"--   {col_name}: {distinct_count:,} distinct values, {null_count:,} nulls ({null_pct:.1f}%)")
                    except:
                        # Skip columns that can't be counted (e.g., binary)
                        pass
                self.schema_text.append("")
            
            # Extract sample data
            if row_count > 0:
                self.schema_text.append("** -- SAMPLE DATA -- **")
                self._extract_sample_data(cursor, schema_name, table_name, column_names, row_count)
                self.schema_text.append("")
            
            self.schema_text.append("")
        
    def _extract_sample_data(self, cursor, schema_name, table_name, column_names, row_count):
        # Calculate samples needed
        if row_count < 50:
            samples = [(0, min(10, row_count))]
        elif row_count <= 100:
            samples = [(0, 3), (row_count - 3, row_count)]
        else:
            # For every 100 rows, add 3 samples
            num_groups = math.ceil(row_count / 100)
            samples = []
            rows_per_group = 3
            
            for i in range(num_groups):
                if i == 0:
                    samples.append((0, rows_per_group))
                else:
                    # Distribute samples evenly
                    start = int(i * row_count / num_groups)
                    samples.append((start, start + rows_per_group))
        
        # Build column list (escape column names)
        col_list = ', '.join([f'[{col}]' for col in column_names])
        
        # Execute samples
        all_rows = []
        for start, end in samples:
            try:
                # Use OFFSET/FETCH for consistent sampling
                query = f"""
                    SELECT {col_list}
                    FROM [{schema_name}].[{table_name}]
                    ORDER BY (SELECT NULL)
                    OFFSET {start} ROWS
                    FETCH NEXT {end - start} ROWS ONLY
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                
                if rows:
                    all_rows.append((start, rows))
            except Exception as e:
                # If OFFSET/FETCH fails, try TOP
                try:
                    query = f"SELECT TOP {min(5, row_count)} {col_list} FROM [{schema_name}].[{table_name}]"
                    cursor.execute(query)
                    rows = cursor.fetchall()
                    if rows:
                        all_rows = [(0, rows)]
                        break
                except:
                    self.schema_text.append("-- Unable to retrieve sample data")
                    return
        
        # Format output
        if all_rows:
            # Header
            header = " | ".join([f"{col[:20]:<20}" for col in column_names])
            self.schema_text.append(f"-- {header}")
            self.schema_text.append("-- " + "-" * len(header))
            
            for idx, (start_idx, rows) in enumerate(all_rows):
                if idx > 0:
                    self.schema_text.append("-- ...")
                    
                for row in rows:
                    formatted_row = []
                    for val in row:
                        if val is None:
                            formatted_row.append("NULL")
                        else:
                            str_val = str(val)[:20]
                            formatted_row.append(str_val)
                    
                    row_str = " | ".join([f"{val:<20}" for val in formatted_row])
                    self.schema_text.append(f"-- {row_str}")
    
    def extract_views(self):
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
        
        views = cursor.fetchall()
        if not views:
            return
            
        for schema_name, view_name, definition in views:
            print(f"  Extracting view: {view_name}")
            
            # Try to get row count
            try:
                cursor.execute(f"SELECT COUNT(*) FROM [{schema_name}].[{view_name}]")
                row_count = cursor.fetchone()[0]
            except:
                row_count = "Unknown"
            
            self.schema_text.append(f"-- === View: {view_name} === --")
            self.schema_text.append(f"-- Schema: {schema_name}")
            self.schema_text.append(f"-- Row Count: {row_count:,}" if isinstance(row_count, int) else f"-- Row Count: {row_count}")
            self.schema_text.append("")
            self.schema_text.append(definition.strip())
            self.schema_text.append("")
            
            # Try to get sample data if possible
            if isinstance(row_count, int) and row_count > 0:
                try:
                    # Get column names
                    cursor.execute(f"""
                        SELECT TOP 1 * FROM [{schema_name}].[{view_name}]
                    """)
                    column_names = [desc[0] for desc in cursor.description]
                    
                    self.schema_text.append("** -- SAMPLE DATA -- **")
                    self._extract_sample_data(cursor, schema_name, view_name, column_names, row_count)
                except:
                    self.schema_text.append("-- Unable to retrieve sample data")
                
            self.schema_text.append("")
            
    def extract_indexes(self):
        cursor = self.conn.cursor()
        
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
        if not indexes:
            return
            
        self.schema_text.append("-- === INDEXES === --")
        self.schema_text.append("")
        
        current_table = None
        for idx in indexes:
            if idx[0]:  # Skip unnamed indexes
                if current_table != f"{idx[1]}.{idx[2]}":
                    current_table = f"{idx[1]}.{idx[2]}"
                    self.schema_text.append(f"-- Table: {current_table}")
                
                # Get index columns
                cursor.execute(f"""
                    SELECT c.name
                    FROM sys.index_columns ic
                    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                    WHERE ic.object_id = {idx[5]} AND ic.index_id = {idx[6]} AND ic.is_included_column = 0
                    ORDER BY ic.key_ordinal
                """)
                index_cols = [row[0] for row in cursor.fetchall()]
                
                stmt = f"--   {idx[0]}: {idx[3]}"
                if idx[4]:
                    stmt += " UNIQUE"
                stmt += f" ({', '.join(index_cols)})"
                
                self.schema_text.append(stmt)
        
        self.schema_text.append("")
                
    def extract_triggers(self):
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
        
        triggers = cursor.fetchall()
        if not triggers:
            return
            
        self.schema_text.append("-- === TRIGGERS === --")
        self.schema_text.append("")
        
        for trigger_name, schema_name, table_name, definition in triggers:
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
    extractor.extract_all('database_schema_ai_enhanced.txt')
    extractor.close()
    
    print("\n📄 AI-enhanced schema extraction complete!")