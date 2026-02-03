import os
import psycopg2

try:
    database_url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(database_url)
    
    with conn.cursor() as cur:
        # Verificar índices e constraints da tabela extraction_results
        cur.execute("""
            SELECT 
                constraint_name, 
                constraint_type,
                table_name
            FROM information_schema.table_constraints 
            WHERE table_name = 'extraction_results';
        """)
        constraints = cur.fetchall()
        
        print("Constraints da tabela extraction_results:")
        for constraint in constraints:
            print(f"  {constraint[0]} - {constraint[1]}")
            
        # Verificar índices únicos
        cur.execute("""
            SELECT 
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE tablename = 'extraction_results';
        """)
        indexes = cur.fetchall()
        
        print("\nÍndices da tabela extraction_results:")
        for index in indexes:
            print(f"  {index[0]}: {index[1]}")
            
    conn.close()
    
except Exception as e:
    print(f"Erro: {e}")
