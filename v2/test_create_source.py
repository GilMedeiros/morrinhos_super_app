import os
import psycopg2
import traceback

def test_create_source():
    try:
        # Usar DATABASE_URL
        database_url = os.getenv("DATABASE_URL")
        print(f"DATABASE_URL: {database_url[:50]}...")
        
        conn = psycopg2.connect(database_url)
        print("✅ Conexão estabelecida")
        
        with conn.cursor() as cur:
            print("📝 Executando query de inserção...")
            
            query = """
                INSERT INTO sources (nome, data_upload, quantidade_itens, registros_processados, status)
                VALUES (%s, CURRENT_TIMESTAMP, %s, %s, %s)
                RETURNING id;
            """
            params = ("teste.pdf", 100, 0, "processing")
            
            print(f"Query: {query}")
            print(f"Params: {params}")
            
            cur.execute(query, params)
            result = cur.fetchone()
            print(f"Resultado: {result}")
            
            if result:
                source_id = result[0]
                conn.commit()
                print(f"✅ Source criado com ID: {source_id}")
                return source_id
            else:
                print("❌ Nenhum resultado retornado")
                return None
                
    except Exception as e:
        print(f"❌ Erro completo: {e}")
        print(f"❌ Tipo do erro: {type(e)}")
        print(f"❌ Traceback:")
        traceback.print_exc()
        if 'conn' in locals():
            conn.rollback()
        return None
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print("🔒 Conexão fechada")

if __name__ == "__main__":
    test_create_source()
