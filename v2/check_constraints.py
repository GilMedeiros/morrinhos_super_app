import os
import psycopg2

try:
    database_url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(database_url)
    
    with conn.cursor() as cur:
        # Verificar constraint de check
        cur.execute("""
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name = 'fontes_dados_status_check';
        """)
        constraints = cur.fetchall()
        
        if constraints:
            print("Constraint encontrada:")
            for constraint in constraints:
                print(f"  Nome: {constraint[0]}")
                print(f"  Regra: {constraint[1]}")
        else:
            print("Constraint não encontrada")
            
        # Verificar todos os constraints da tabela sources
        cur.execute("""
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints cc
            JOIN information_schema.constraint_column_usage ccu
            ON cc.constraint_name = ccu.constraint_name
            WHERE ccu.table_name = 'sources';
        """)
        all_constraints = cur.fetchall()
        
        print("\nTodos os constraints da tabela sources:")
        for constraint in all_constraints:
            print(f"  {constraint[0]}: {constraint[1]}")
            
    conn.close()
    
except Exception as e:
    print(f"Erro: {e}")
