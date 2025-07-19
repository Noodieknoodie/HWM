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
        self.extract_stored_procedures()
        self.extract_functions()
        self.extract_indexes()
        self.extract_triggers()
        self.extract_sequences()
        self.extract_synonyms()
        self.extract_user_types()
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(line for line in self.schema_text if line.strip()))
            
        print(f"✅ Schema saved to: {output_file}")
        
    def add_header(self):
        self.schema_text.extend([
            f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "-- ===== TABLES =====",
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
            self.schema_text.append(f"-- Table: {table_name}")
            self.schema_text.append(f"CREATE TABLE [{schema_name}].[{table_name}] (")
            
            # Get columns including computed columns
            cursor.execute(f"""
                SELECT 
                    c.name AS column_name,
                    t.name AS data_type,
                    c.max_length,
                    c.precision,
                    c.scale,
                    c.is_nullable,
                    dc.definition AS default_value,
                    c.is_identity,
                    c.is_computed,
                    cc.definition AS computed_definition
                FROM sys.columns c
                INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
                LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
                LEFT JOIN sys.computed_columns cc ON c.object_id = cc.object_id AND c.column_id = cc.column_id
                WHERE c.object_id = OBJECT_ID('{schema_name}.{table_name}')
                ORDER BY c.column_id
            """)
            
            columns = cursor.fetchall()
            column_defs = []
            
            for col in columns:
                if col[8]:  # is_computed
                    col_def = f"    [{col[0]}] AS {col[9]}"
                else:
                    col_def = f"    [{col[0]}] {self._format_data_type(col[1], col[2], col[3], col[4])}"
                    
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
            
            # Get unique constraints
            cursor.execute(f"""
                SELECT 
                    kc.name AS constraint_name,
                    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
                FROM sys.key_constraints kc
                INNER JOIN sys.index_columns ic ON kc.parent_object_id = ic.object_id AND kc.unique_index_id = ic.index_id
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                WHERE kc.parent_object_id = OBJECT_ID('{schema_name}.{table_name}') AND kc.type = 'UQ'
                GROUP BY kc.name
            """)
            
            for uq in cursor.fetchall():
                column_defs.append(f"    CONSTRAINT [{uq[0]}] UNIQUE ({uq[1]})")
            
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
            
            # Get foreign keys
            cursor.execute(f"""
                SELECT 
                    fk.name AS fk_name,
                    STRING_AGG(COL_NAME(fkc.parent_object_id, fkc.parent_column_id), ', ') 
                        WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS parent_columns,
                    SCHEMA_NAME(tr.schema_id) AS ref_schema,
                    tr.name AS ref_table,
                    STRING_AGG(COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id), ', ') 
                        WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ref_columns,
                    fk.delete_referential_action_desc,
                    fk.update_referential_action_desc
                FROM sys.foreign_keys fk
                INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
                INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                WHERE fk.parent_object_id = OBJECT_ID('{schema_name}.{table_name}')
                GROUP BY fk.name, tr.schema_id, tr.name, fk.delete_referential_action_desc, fk.update_referential_action_desc
            """)
            
            for fk in cursor.fetchall():
                self.schema_text.append(f"ALTER TABLE [{schema_name}].[{table_name}] ADD CONSTRAINT [{fk[0]}]")
                self.schema_text.append(f"    FOREIGN KEY ({fk[1]}) REFERENCES [{fk[2]}].[{fk[3]}] ({fk[4]})")
                
                if fk[5] != 'NO_ACTION' or fk[6] != 'NO_ACTION':
                    actions = []
                    if fk[5] != 'NO_ACTION':
                        actions.append(f"ON DELETE {fk[5].replace('_', ' ')}")
                    if fk[6] != 'NO_ACTION':
                        actions.append(f"ON UPDATE {fk[6].replace('_', ' ')}")
                    self.schema_text.append(f"    {' '.join(actions)};")
                else:
                    self.schema_text[-1] += ";"
            
            # Extract sample data
            self._extract_table_sample_data(schema_name, table_name)
            self.schema_text.append("")
        
    def extract_views(self):
        self.schema_text.extend([
            "",
            "-- ===== VIEWS =====",
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
            
            # Extract sample data for view
            self._extract_view_sample_data(schema_name, view_name)
            self.schema_text.append("")
            
    def extract_stored_procedures(self):
        self.schema_text.extend([
            "",
            "-- ===== STORED PROCEDURES =====",
            ""
        ])
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                SCHEMA_NAME(p.schema_id) AS schema_name,
                p.name AS proc_name,
                m.definition AS proc_definition
            FROM sys.procedures p
            JOIN sys.sql_modules m ON p.object_id = m.object_id
            WHERE p.is_ms_shipped = 0
            ORDER BY schema_name, proc_name
        """)
        
        for schema_name, proc_name, definition in cursor.fetchall():
            print(f"  Extracting procedure: {proc_name}")
            self.schema_text.append(f"-- Stored Procedure: {proc_name}")
            self.schema_text.append(definition.strip())
            self.schema_text.append("GO")
            
            # Get parameters and show test execution
            cursor.execute(f"""
                SELECT 
                    p.name AS param_name,
                    t.name AS data_type,
                    p.max_length,
                    p.precision,
                    p.scale,
                    p.is_output,
                    p.has_default_value,
                    p.default_value
                FROM sys.parameters p
                INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
                WHERE p.object_id = OBJECT_ID('{schema_name}.{proc_name}')
                ORDER BY p.parameter_id
            """)
            
            params = cursor.fetchall()
            if params:
                self.schema_text.append(f"-- Parameters:")
                for param in params:
                    param_def = f"--   {param[0]} {self._format_data_type(param[1], param[2], param[3], param[4])}"
                    if param[5]:  # is_output
                        param_def += " OUTPUT"
                    if param[6]:  # has_default_value
                        param_def += f" = {param[7]}"
                    self.schema_text.append(param_def)
                
                # Create test execution
                self.schema_text.append(f"-- Sample execution:")
                exec_stmt = f"-- EXEC [{schema_name}].[{proc_name}]"
                test_values = []
                for param in params:
                    if not param[5]:  # not output param
                        if 'date' in param[1].lower():
                            test_values.append(f"{param[0]} = '2024-12-31'")
                        elif param[1] in ('int', 'bigint', 'smallint', 'tinyint'):
                            test_values.append(f"{param[0]} = 1")
                        elif param[1] in ('varchar', 'nvarchar', 'char', 'nchar'):
                            test_values.append(f"{param[0]} = 'TestValue'")
                        elif param[1] in ('decimal', 'numeric', 'float', 'real'):
                            test_values.append(f"{param[0]} = 100.00")
                        elif param[1] == 'bit':
                            test_values.append(f"{param[0]} = 1")
                
                if test_values:
                    exec_stmt += " " + ", ".join(test_values)
                exec_stmt += ";"
                self.schema_text.append(exec_stmt)
            
            self.schema_text.append("")
            
    def extract_functions(self):
        self.schema_text.extend([
            "",
            "-- ===== FUNCTIONS =====",
            ""
        ])
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                SCHEMA_NAME(o.schema_id) AS schema_name,
                o.name AS function_name,
                o.type_desc AS function_type,
                m.definition AS function_definition,
                CASE 
                    WHEN o.type IN ('FN', 'FS') THEN rt.name
                    ELSE NULL
                END AS return_type,
                CASE 
                    WHEN o.type IN ('FN', 'FS') THEN rt.max_length
                    ELSE NULL
                END AS return_max_length,
                CASE 
                    WHEN o.type IN ('FN', 'FS') THEN rt.precision
                    ELSE NULL
                END AS return_precision,
                CASE 
                    WHEN o.type IN ('FN', 'FS') THEN rt.scale
                    ELSE NULL
                END AS return_scale
            FROM sys.objects o
            JOIN sys.sql_modules m ON o.object_id = m.object_id
            LEFT JOIN sys.parameters rp ON o.object_id = rp.object_id AND rp.parameter_id = 0
            LEFT JOIN sys.types rt ON rp.user_type_id = rt.user_type_id
            WHERE o.type IN ('FN', 'IF', 'TF', 'FS', 'FT')
            AND o.is_ms_shipped = 0
            ORDER BY schema_name, function_name
        """)
        
        for row in cursor.fetchall():
            schema_name, func_name, func_type, definition = row[0], row[1], row[2], row[3]
            print(f"  Extracting function: {func_name} ({func_type})")
            self.schema_text.append(f"-- Function: {func_name} ({func_type})")
            self.schema_text.append(definition.strip())
            self.schema_text.append("GO")
            
            # Get parameters
            cursor.execute(f"""
                SELECT 
                    p.name AS param_name,
                    t.name AS data_type,
                    p.max_length,
                    p.precision,
                    p.scale
                FROM sys.parameters p
                INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
                WHERE p.object_id = OBJECT_ID('{schema_name}.{func_name}')
                AND p.parameter_id > 0
                ORDER BY p.parameter_id
            """)
            
            params = cursor.fetchall()
            
            # Create test execution based on function type
            if 'SCALAR' in func_type:
                # Scalar function test
                test_stmt = f"-- SELECT [{schema_name}].[{func_name}]("
                test_values = []
                for param in params:
                    if 'date' in param[1].lower():
                        test_values.append("'2024-12-31'")
                    elif param[1] in ('int', 'bigint', 'smallint', 'tinyint'):
                        test_values.append("1")
                    elif param[1] in ('varchar', 'nvarchar', 'char', 'nchar'):
                        test_values.append("'TestValue'")
                    elif param[1] in ('decimal', 'numeric', 'float', 'real'):
                        test_values.append("100.00")
                    elif param[1] == 'bit':
                        test_values.append("1")
                
                test_stmt += ", ".join(test_values) + ") AS Result;"
                self.schema_text.append(f"-- Sample usage:")
                self.schema_text.append(test_stmt)
                
                # Try to execute and show result
                try:
                    cursor.execute(test_stmt.replace('-- ', ''))
                    result = cursor.fetchone()
                    if result:
                        self.schema_text.append(f"-- Expected result type: {row[4] if row[4] else 'varies'}")
                except:
                    pass
                    
            elif 'TABLE' in func_type:
                # Table-valued function test
                test_stmt = f"-- SELECT TOP 3 * FROM [{schema_name}].[{func_name}]("
                test_values = []
                for param in params:
                    if 'date' in param[1].lower():
                        test_values.append("'2024-12-31'")
                    elif param[1] in ('int', 'bigint', 'smallint', 'tinyint'):
                        test_values.append("1")
                    elif param[1] in ('varchar', 'nvarchar', 'char', 'nchar'):
                        test_values.append("'TestValue'")
                    elif param[1] in ('decimal', 'numeric', 'float', 'real'):
                        test_values.append("100.00")
                    elif param[1] == 'bit':
                        test_values.append("1")
                
                test_stmt += ", ".join(test_values) + ");"
                self.schema_text.append(f"-- Sample usage:")
                self.schema_text.append(test_stmt)
                
                # Try to get column info
                try:
                    # For inline table-valued functions, try to get columns
                    if 'INLINE' in func_type:
                        test_query = test_stmt.replace('-- ', '').replace('TOP 3 *', 'TOP 0 *')
                        cursor.execute(test_query)
                        if cursor.description:
                            self.schema_text.append(f"-- Returns columns: {', '.join([desc[0] for desc in cursor.description])}")
                except:
                    pass
            
            self.schema_text.append("")
                    
    def extract_indexes(self):
        self.schema_text.extend([
            "",
            "-- ===== INDEXES =====",
            ""
        ])
        
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT
                i.name AS index_name,
                SCHEMA_NAME(t.schema_id) AS schema_name,
                t.name AS table_name,
                i.type_desc,
                i.is_unique,
                i.object_id,
                i.index_id,
                i.filter_definition
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
                    SELECT c.name, ic.is_descending_key
                    FROM sys.index_columns ic
                    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                    WHERE ic.object_id = {idx[5]} AND ic.index_id = {idx[6]} AND ic.is_included_column = 0
                    ORDER BY ic.key_ordinal
                """)
                index_cols = []
                for col_name, is_desc in cursor.fetchall():
                    col_def = f"[{col_name}]"
                    if is_desc:
                        col_def += " DESC"
                    index_cols.append(col_def)
                
                # Get included columns
                cursor.execute(f"""
                    SELECT c.name
                    FROM sys.index_columns ic
                    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                    WHERE ic.object_id = {idx[5]} AND ic.index_id = {idx[6]} AND ic.is_included_column = 1
                    ORDER BY ic.index_column_id
                """)
                included_cols = [f"[{row[0]}]" for row in cursor.fetchall()]
                
                stmt = "CREATE "
                if idx[4]:  # is_unique
                    stmt += "UNIQUE "
                stmt += f"{idx[3]} INDEX [{idx[0]}] ON [{idx[1]}].[{idx[2]}] ({', '.join(index_cols)})"
                
                if included_cols:
                    stmt += f" INCLUDE ({', '.join(included_cols)})"
                    
                if idx[7]:  # filter_definition
                    stmt += f" WHERE {idx[7]}"
                    
                stmt += ";"
                self.schema_text.append(stmt)
                
    def extract_triggers(self):
        self.schema_text.extend([
            "",
            "-- ===== TRIGGERS =====",
            ""
        ])
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                t.name AS trigger_name,
                SCHEMA_NAME(p.schema_id) AS schema_name,
                p.name AS table_name,
                m.definition AS trigger_definition,
                t.is_disabled
            FROM sys.triggers t
            JOIN sys.tables p ON t.parent_id = p.object_id
            JOIN sys.sql_modules m ON t.object_id = m.object_id
            WHERE t.is_ms_shipped = 0
            ORDER BY schema_name, table_name, trigger_name
        """)
        
        for trigger_name, schema_name, table_name, definition, is_disabled in cursor.fetchall():
            print(f"  Extracting trigger: {trigger_name}")
            self.schema_text.append(f"-- Trigger: {trigger_name} on {table_name}")
            if is_disabled:
                self.schema_text.append(f"-- Status: DISABLED")
            self.schema_text.append(definition.strip())
            self.schema_text.append("GO")
            self.schema_text.append("")
            
    def extract_sequences(self):
        self.schema_text.extend([
            "",
            "-- ===== SEQUENCES =====",
            ""
        ])
        
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                SELECT 
                    SCHEMA_NAME(schema_id) AS schema_name,
                    name AS sequence_name,
                    start_value,
                    increment,
                    minimum_value,
                    maximum_value,
                    is_cycling,
                    current_value
                FROM sys.sequences
                ORDER BY schema_name, sequence_name
            """)
            
            sequences = cursor.fetchall()
            
            if sequences:
                for seq in sequences:
                    print(f"  Extracting sequence: {seq[1]}")
                    stmt = f"CREATE SEQUENCE [{seq[0]}].[{seq[1]}]"
                    stmt += f"\n    START WITH {seq[2]}"
                    stmt += f"\n    INCREMENT BY {seq[3]}"
                    
                    if seq[4] is not None:
                        stmt += f"\n    MINVALUE {seq[4]}"
                    else:
                        stmt += f"\n    NO MINVALUE"
                        
                    if seq[5] is not None:
                        stmt += f"\n    MAXVALUE {seq[5]}"
                    else:
                        stmt += f"\n    NO MAXVALUE"
                        
                    if seq[6]:
                        stmt += f"\n    CYCLE"
                    else:
                        stmt += f"\n    NO CYCLE"
                        
                    stmt += ";"
                    self.schema_text.append(stmt)
                    self.schema_text.append(f"-- Current value: {seq[7]}")
                    self.schema_text.append(f"-- Sample usage: SELECT NEXT VALUE FOR [{seq[0]}].[{seq[1]}];")
                    self.schema_text.append("")
            else:
                self.schema_text.append("-- No sequences found")
                self.schema_text.append("")
        except:
            self.schema_text.append("-- Sequences not supported in this SQL Server version")
            self.schema_text.append("")
            
    def extract_synonyms(self):
        self.schema_text.extend([
            "",
            "-- ===== SYNONYMS =====",
            ""
        ])
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                SCHEMA_NAME(schema_id) AS schema_name,
                name AS synonym_name,
                base_object_name
            FROM sys.synonyms
            ORDER BY schema_name, synonym_name
        """)
        
        synonyms = cursor.fetchall()
        
        if synonyms:
            for syn in synonyms:
                print(f"  Extracting synonym: {syn[1]}")
                self.schema_text.append(f"CREATE SYNONYM [{syn[0]}].[{syn[1]}] FOR {syn[2]};")
            self.schema_text.append("")
        else:
            self.schema_text.append("-- No synonyms found")
            self.schema_text.append("")
            
    def extract_user_types(self):
        self.schema_text.extend([
            "",
            "-- ===== USER-DEFINED TYPES =====",
            ""
        ])
        
        cursor = self.conn.cursor()
        
        # Table types
        cursor.execute("""
            SELECT 
                SCHEMA_NAME(tt.schema_id) AS schema_name,
                tt.name AS type_name,
                tt.type_table_object_id
            FROM sys.table_types tt
            WHERE tt.is_user_defined = 1
            ORDER BY schema_name, type_name
        """)
        
        table_types = cursor.fetchall()
        
        if table_types:
            self.schema_text.append("-- Table Types:")
            for schema_name, type_name, table_obj_id in table_types:
                print(f"  Extracting table type: {type_name}")
                self.schema_text.append(f"CREATE TYPE [{schema_name}].[{type_name}] AS TABLE (")
                
                # Get columns for table type
                cursor.execute(f"""
                    SELECT 
                        c.name AS column_name,
                        t.name AS data_type,
                        c.max_length,
                        c.precision,
                        c.scale,
                        c.is_nullable
                    FROM sys.columns c
                    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
                    WHERE c.object_id = {table_obj_id}
                    ORDER BY c.column_id
                """)
                
                cols = []
                for col in cursor.fetchall():
                    col_def = f"    [{col[0]}] {self._format_data_type(col[1], col[2], col[3], col[4])}"
                    if not col[5]:
                        col_def += " NOT NULL"
                    cols.append(col_def)
                
                self.schema_text.append(',\n'.join(cols))
                self.schema_text.append(");")
                self.schema_text.append(f"-- Sample usage: DECLARE @MyTable [{schema_name}].[{type_name}];")
                self.schema_text.append("")
        
        # Scalar types
        cursor.execute("""
            SELECT 
                SCHEMA_NAME(ut.schema_id) AS schema_name,
                ut.name AS type_name,
                ut.system_type_id,
                ut.max_length,
                ut.precision,
                ut.scale,
                ut.is_nullable,
                t.name as base_type
            FROM sys.types ut
            INNER JOIN sys.types t ON ut.system_type_id = t.user_type_id
            WHERE ut.is_user_defined = 1 AND ut.is_table_type = 0
            ORDER BY schema_name, type_name
        """)
        
        scalar_types = cursor.fetchall()
        
        if scalar_types:
            self.schema_text.append("-- Scalar Types:")
            for row in scalar_types:
                print(f"  Extracting scalar type: {row[1]}")
                stmt = f"CREATE TYPE [{row[0]}].[{row[1]}] FROM {self._format_data_type(row[7], row[3], row[4], row[5])}"
                if not row[6]:
                    stmt += " NOT NULL"
                stmt += ";"
                self.schema_text.append(stmt)
            self.schema_text.append("")
            
    def _find_date_column(self, schema_name, table_name):
        """Find potential date columns in table"""
        cursor = self.conn.cursor()
        
        # Common date column patterns
        date_patterns = [
            'date', 'created', 'modified', 'updated', 'timestamp', 
            'datetime', 'period', 'effective', 'transaction'
        ]
        
        cursor.execute(f"""
            SELECT c.name, t.name as data_type
            FROM sys.columns c
            INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
            WHERE c.object_id = OBJECT_ID('{schema_name}.{table_name}')
            AND t.name IN ('date', 'datetime', 'datetime2', 'smalldatetime')
            ORDER BY c.column_id
        """)
        
        date_columns = cursor.fetchall()
        
        if not date_columns:
            return None
            
        # Prioritize columns with common date patterns
        for col_name, data_type in date_columns:
            col_lower = col_name.lower()
            for pattern in date_patterns:
                if pattern in col_lower:
                    return col_name
                    
        # Just return the first date column if no pattern matches
        return date_columns[0][0]
            
    def _extract_table_sample_data(self, schema_name, table_name):
        cursor = self.conn.cursor()
        try:
            # Get column names
            cursor.execute(f"""
                SELECT c.name 
                FROM sys.columns c
                WHERE c.object_id = OBJECT_ID('{schema_name}.{table_name}')
                ORDER BY c.column_id
            """)
            columns = [row[0] for row in cursor.fetchall()]
            
            # Check for date column
            date_col = self._find_date_column(schema_name, table_name)
            
            if date_col:
                # Try to get data from end of 2024
                try:
                    cursor.execute(f"""
                        SELECT TOP 3 * 
                        FROM [{schema_name}].[{table_name}]
                        WHERE [{date_col}] >= '2024-10-01' 
                        AND [{date_col}] < '2025-01-01'
                        ORDER BY [{date_col}] DESC
                    """)
                    rows = cursor.fetchall()
                    
                    if not rows:
                        # If no 2024 data, try any historical data
                        cursor.execute(f"""
                            SELECT TOP 3 * 
                            FROM [{schema_name}].[{table_name}]
                            WHERE [{date_col}] < '2025-01-01'
                            ORDER BY [{date_col}] DESC
                        """)
                        rows = cursor.fetchall()
                        
                except:
                    # Fall back to regular TOP 3
                    cursor.execute(f"SELECT TOP 3 * FROM [{schema_name}].[{table_name}]")
                    rows = cursor.fetchall()
            else:
                # No date column, use regular TOP 3
                cursor.execute(f"SELECT TOP 3 * FROM [{schema_name}].[{table_name}]")
                rows = cursor.fetchall()
            
            if rows:
                if date_col:
                    self.schema_text.append(f"-- Sample data (3 rows from end of 2024 or latest available):")
                else:
                    self.schema_text.append(f"-- Sample data (3 rows):")
                self.schema_text.append(f"-- {' | '.join(columns)}")
                for row in rows:
                    values = []
                    for val in row:
                        if val is None:
                            values.append('NULL')
                        elif isinstance(val, str):
                            values.append(repr(val)[:50])  # Truncate long strings
                        else:
                            values.append(str(val))
                    self.schema_text.append(f"-- {' | '.join(values)}")
        except Exception as e:
            self.schema_text.append(f"-- Sample data error: {str(e)[:100]}")
            
    def _extract_view_sample_data(self, schema_name, view_name):
        cursor = self.conn.cursor()
        try:
            # Get column names and check for date columns
            cursor.execute(f"SELECT TOP 0 * FROM [{schema_name}].[{view_name}]")
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            
            # Find date-like column
            date_col = None
            date_patterns = ['date', 'created', 'modified', 'updated', 'timestamp', 'datetime', 'period', 'effective', 'transaction']
            
            for col in columns:
                col_lower = col.lower()
                for pattern in date_patterns:
                    if pattern in col_lower:
                        date_col = col
                        break
                if date_col:
                    break
            
            if date_col:
                # Try to get data from end of 2024
                try:
                    cursor.execute(f"""
                        SELECT TOP 3 * 
                        FROM [{schema_name}].[{view_name}]
                        WHERE [{date_col}] >= '2024-10-01' 
                        AND [{date_col}] < '2025-01-01'
                        ORDER BY [{date_col}] DESC
                    """)
                    rows = cursor.fetchall()
                    
                    if not rows:
                        # If no 2024 data, try any historical data
                        cursor.execute(f"""
                            SELECT TOP 3 * 
                            FROM [{schema_name}].[{view_name}]
                            WHERE [{date_col}] < '2025-01-01'
                            ORDER BY [{date_col}] DESC
                        """)
                        rows = cursor.fetchall()
                        
                except:
                    # Fall back to regular TOP 3
                    cursor.execute(f"SELECT TOP 3 * FROM [{schema_name}].[{view_name}]")
                    rows = cursor.fetchall()
            else:
                # No date column, use regular TOP 3
                cursor.execute(f"SELECT TOP 3 * FROM [{schema_name}].[{view_name}]")
                rows = cursor.fetchall()
            
            if rows:
                if date_col:
                    self.schema_text.append(f"-- Sample data (3 rows from end of 2024 or latest available):")
                else:
                    self.schema_text.append(f"-- Sample data (3 rows):")
                self.schema_text.append(f"-- {' | '.join(columns)}")
                
                for row in rows:
                    values = []
                    for val in row:
                        if val is None:
                            values.append('NULL')
                        elif isinstance(val, str):
                            values.append(repr(val)[:50])
                        else:
                            values.append(str(val))
                    self.schema_text.append(f"-- {' | '.join(values)}")
        except Exception as e:
            self.schema_text.append(f"-- Sample data error: {str(e)[:100]}")    
                    
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
        "Pwd=Prunes27$$$$;"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )
    
    extractor = DatabaseSchemaExtractor(connection_string)
    extractor.extract_all('HohimerPro_401k_Schema.txt')
    extractor.close()
    
    print("\n📄 Schema extraction complete!")