import os
import psycopg2

try:
    # Usar DATABASE_URL se disponível
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        print(f"Usando DATABASE_URL: {database_url[:50]}...")
        conn = psycopg2.connect(database_url)
    else:
        print("Usando parâmetros individuais...")
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            dbname=os.getenv('DB_NAME', 'morrinhos'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'postgres123'),
            sslmode='disable'
        )
    
    with conn.cursor() as cur:
        # Verificar se a tabela sources existe
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sources' 
            ORDER BY ordinal_position;
        """)
        columns = cur.fetchall()
        
        if columns:
            print('Colunas da tabela sources:')
            for col in columns:
                print(f'  {col[0]} - {col[1]}')
        else:
            print('Tabela sources não encontrada!')
            
        # Verificar se a tabela extraction_results existe
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'extraction_results' 
            ORDER BY ordinal_position;
        """)
        ext_columns = cur.fetchall()
        
        if ext_columns:
            print('\nColunas da tabela extraction_results:')
            for col in ext_columns:
                print(f'  {col[0]} - {col[1]}')
        else:
            print('\nTabela extraction_results não encontrada!')
            
    conn.close()
    print('\nConexão com banco funcionando!')
    
except Exception as e:
    print(f'Erro: {e}')
