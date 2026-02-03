import os
import psycopg2

def modificar_constraint():
    try:
        database_url = os.getenv("DATABASE_URL")
        print(f"Conectando ao banco: {database_url[:50]}...")
        
        conn = psycopg2.connect(database_url)
        
        with conn.cursor() as cur:
            print("🔍 Verificando constraint atual...")
            cur.execute("""
                SELECT constraint_name, table_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'extraction_results' 
                AND constraint_name = 'contribuintes_source_id_fkey'
            """)
            result = cur.fetchall()
            print(f"Constraint encontrada: {result}")
            
            print("🔧 Iniciando modificação...")
            
            # Remover constraint atual
            print("🗑️ Removendo constraint atual...")
            cur.execute("""
                ALTER TABLE extraction_results 
                DROP CONSTRAINT IF EXISTS contribuintes_source_id_fkey
            """)
            
            # Adicionar constraint com CASCADE
            print("➕ Adicionando constraint com CASCADE...")
            cur.execute("""
                ALTER TABLE extraction_results 
                ADD CONSTRAINT contribuintes_source_id_fkey 
                FOREIGN KEY (source_id) 
                REFERENCES sources(id) 
                ON DELETE CASCADE
            """)
            
            conn.commit()
            print("✅ Constraint modificada com sucesso!")
            
            # Verificar se foi aplicado
            print("🔍 Verificando constraint modificada...")
            cur.execute("""
                SELECT constraint_name, table_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'extraction_results' 
                AND constraint_name = 'contribuintes_source_id_fkey'
            """)
            result = cur.fetchall()
            print(f"Constraint após modificação: {result}")
            
        conn.close()
        print("🎉 Processo concluído! Agora é possível deletar sources sem erro de foreign key.")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        if 'conn' in locals():
            conn.rollback()

if __name__ == "__main__":
    modificar_constraint()
