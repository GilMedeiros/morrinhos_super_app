import os
import psycopg2

def test_create_source_processando():
    try:
        database_url = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(database_url)
        
        with conn.cursor() as cur:
            print("Testando com status 'processando'...")
            
            query = """
                INSERT INTO sources (nome, data_upload, quantidade_itens, registros_processados, status)
                VALUES (%s, CURRENT_TIMESTAMP, %s, %s, %s)
                RETURNING id;
            """
            params = ("teste_processando.pdf", 100, 0, "processando")
            
            cur.execute(query, params)
            result = cur.fetchone()
            
            if result:
                source_id = result[0]
                conn.commit()
                print(f"✅ Source criado com ID: {source_id}")
                return source_id
            else:
                print("❌ Nenhum resultado retornado")
                return None
                
    except Exception as e:
        print(f"❌ Erro: {e}")
        if 'conn' in locals():
            conn.rollback()
        return None
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    test_create_source_processando()
