import os
import psycopg2
from psycopg2 import sql, extras
import json

def get_db_connection():
    """Cria e retorna uma nova conexão com o banco de dados."""
    try:
        # Usar DATABASE_URL se disponível (Docker), senão usar variáveis individuais
        database_url = os.getenv("DATABASE_URL")
        
        if database_url:
            conn = psycopg2.connect(database_url, sslmode='disable')
        else:
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
                dbname=os.getenv("DB_NAME", "morrinhos"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres123"),
                sslmode='disable'
            )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Erro ao conectar ao PostgreSQL: {e}")
        return None

def create_source(nome, quantidade_itens=0, registros_processados=0, status='processando'):
    """
    Cria um novo registro na tabela 'sources' e retorna o ID gerado.
    """
    print(f"🔄 Tentando criar source: nome={nome}, quantidade_itens={quantidade_itens}, registros_processados={registros_processados}, status={status}")
    
    conn = get_db_connection()
    if conn is None:
        print("❌ Erro: Não foi possível conectar ao banco de dados")
        return None

    try:
        with conn.cursor() as cur:
            print("📝 Executando query de inserção...")
            cur.execute(
                """
                INSERT INTO sources (nome, data_upload, quantidade_itens, registros_processados, status)
                VALUES (%s, CURRENT_TIMESTAMP, %s, %s, %s)
                RETURNING id;
                """,
                (nome, quantidade_itens, registros_processados, status)
            )
            source_id = cur.fetchone()[0]
            conn.commit()
            print(f"✅ Source criado com ID: {source_id}")
            return source_id
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"❌ Erro detalhado ao criar source: {error}")
        print(f"❌ Tipo do erro: {type(error)}")
        conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def update_source_items_count(source_id, quantidade_itens):
    """
    Atualiza a quantidade de itens processados para um source específico.
    """
    conn = get_db_connection()
    if conn is None:
        return False

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sources SET quantidade_itens = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (quantidade_itens, source_id)
            )
            conn.commit()
            print(f"Source {source_id} atualizado com {quantidade_itens} itens")
            return True
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Erro ao atualizar source: {error}")
        conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def update_source_processed_count(source_id, registros_processados):
    """
    Atualiza a quantidade de registros processados para um source específico.
    """
    conn = get_db_connection()
    if conn is None:
        return False

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sources SET registros_processados = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (registros_processados, source_id)
            )
            conn.commit()
            print(f"Source {source_id} atualizado com {registros_processados} registros processados")
            return True
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Erro ao atualizar registros processados do source: {error}")
        conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def update_source_status(source_id, status):
    """
    Atualiza o status de um source específico.
    """
    conn = get_db_connection()
    if conn is None:
        return False

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sources SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (status, source_id)
            )
            conn.commit()
            print(f"Source {source_id} atualizado com status: {status}")
            return True
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Erro ao atualizar status do source: {error}")
        conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def insert_extraction_data(data, source_id):
    """
    Insere uma lista de dicionários na tabela 'extraction_results'.
    Utiliza a cláusula ON CONFLICT para evitar a inserção de registros duplicados no mesmo source.
    Filtra registros com valores nulos ou vazios na coluna 'nome'.
    Retorna um dicionário com informações detalhadas sobre a inserção.
    """
    if not data:
        print("Nenhum dado para inserir.")
        return {
            'success': False,
            'inserted_count': 0,
            'duplicates': [],
            'invalid_records': [],
            'total_processed': 0
        }

    if not source_id:
        print("Source ID é obrigatório.")
        return {
            'success': False,
            'inserted_count': 0,
            'duplicates': [],
            'invalid_records': [],
            'total_processed': 0
        }

    # Filtrar registros válidos (com nome não nulo e não vazio)
    valid_data = []
    invalid_records = []
    
    for item in data:
        ccp = item.get('CCP')
        nome = item.get('CONTRIBUINTE')
        celular = item.get('CELULAR', '')
        processo = item.get('PROCESSO(S)', '')
        valor_devido = item.get('VALOR DEVIDO')
        
        # Verificar se nome é válido (campo obrigatório)
        if not nome or not str(nome).strip():
            invalid_records.append({
                'ccp': ccp or 'Vazio',
                'nome': 'Nome vazio',
                'motivo': 'Nome do contribuinte está vazio',
                'processo': processo or 'N/A'
            })
            print(f"Registro ignorado por ter nome inválido: {item}")
            continue
            
        # Se chegou até aqui, o registro é válido
        valid_data.append(item)
    
    if not valid_data:
        print("Nenhum registro válido para inserir após filtragem.")
        return {
            'success': False,
            'inserted_count': 0,
            'duplicates': [],
            'invalid_records': invalid_records,
            'total_processed': len(data)
        }
    
    print(f"Tentando inserir {len(valid_data)} registros válidos de {len(data)} total para source_id {source_id}.")

    conn = get_db_connection()
    if conn is None:
        return {
            'success': False,
            'inserted_count': 0,
            'duplicates': [],
            'invalid_records': invalid_records,
            'total_processed': len(data)
        }

    try:
        with conn.cursor() as cur:
            # Verificar quais CCPs já existem para identificar duplicatas
            ccps_para_inserir = [item.get('CCP') for item in valid_data if item.get('CCP')]
            
            # Query para verificar registros existentes (por CCP e source_id)
            if ccps_para_inserir:
                cur.execute(
                    "SELECT ccp, nome FROM extraction_results WHERE source_id = %s AND ccp = ANY(%s)",
                    (source_id, ccps_para_inserir)
                )
                existing_records = cur.fetchall()
                existing_ccps = {record[0]: record[1] for record in existing_records}
            else:
                existing_ccps = {}
            
            # Contar registros antes da inserção
            cur.execute("SELECT COUNT(*) FROM extraction_results WHERE source_id = %s", (source_id,))
            count_before = cur.fetchone()[0]
            
            # Inserir dados usando execute_values para melhor performance
            extras.execute_values(
                cur,
                """
                INSERT INTO extraction_results (
                    source_id, ccp, nome, celular, processo, valor_devido, status
                ) VALUES %s;
                """,
                [
                    (
                        source_id,
                        item.get('CCP'),
                        item.get('CONTRIBUINTE'),
                        item.get('CELULAR'),
                        item.get('PROCESSO(S)'),
                        item.get('VALOR DEVIDO'),
                        item.get('status', 'ativo')
                    ) for item in valid_data
                ]
            )
            
            # Contar registros após a inserção
            cur.execute("SELECT COUNT(*) FROM extraction_results WHERE source_id = %s", (source_id,))
            count_after = cur.fetchone()[0]
            
            # Calcular quantos foram realmente inseridos
            inserted_count = count_after - count_before
            
            # Identificar registros duplicados com mais detalhes
            duplicates = []
            for item in valid_data:
                ccp_num = item.get('CCP')
                if ccp_num and ccp_num in existing_ccps:
                    duplicates.append({
                        'ccp': ccp_num,
                        'nome': item.get('CONTRIBUINTE', 'N/A'),
                        'processo': item.get('PROCESSO(S)', 'N/A'),
                        'nome_existente': existing_ccps[ccp_num],
                        'valor_devido': item.get('VALOR DEVIDO', 0),
                        'motivo': f'CCP {ccp_num} já existe na lista'
                    })
            
            conn.commit()
            
            result = {
                'success': True,
                'inserted_count': inserted_count,
                'duplicates': duplicates,
                'invalid_records': invalid_records,
                'total_processed': len(data),
                'total_valid': len(valid_data),
                'total_in_source': count_after
            }
            
            print(f"{inserted_count} novos registros inseridos com sucesso! (Total no source: {count_after})")
            if duplicates:
                print(f"{len(duplicates)} registros duplicados foram atualizados.")
            if invalid_records:
                print(f"{len(invalid_records)} registros inválidos foram ignorados.")
                
            return result
            
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Erro na inserção de dados: {error}")
        conn.rollback()
        raise error  # Re-raise para que a API possa capturar
    finally:
        if conn:
            conn.close()

