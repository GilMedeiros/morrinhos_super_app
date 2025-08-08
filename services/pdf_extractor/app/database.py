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

def create_source(nome, quantidade_itens=0, status='pending'):
    """
    Cria um novo registro na tabela 'sources' e retorna o ID gerado.
    """
    conn = get_db_connection()
    if conn is None:
        return None

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sources (nome, quantidade_itens, status)
                VALUES (%s, %s, %s)
                RETURNING id;
                """,
                (nome, quantidade_itens, status)
            )
            source_id = cur.fetchone()[0]
            conn.commit()
            print(f"Source criado com ID: {source_id}")
            return source_id
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Erro ao criar source: {error}")
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
                UPDATE sources SET quantidade_itens = %s
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

def insert_data(data, source_id):
    """
    Insere uma lista de dicionários na tabela 'solicitacoes'.
    Utiliza a cláusula ON CONFLICT para evitar a inserção de solicitações duplicadas no mesmo source.
    Filtra registros com valores nulos ou vazios na coluna 'solicitacao'.
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

    # Filtrar registros válidos (com solicitacao não nula e não vazia)
    valid_data = []
    invalid_records = []
    
    for item in data:
        solicitacao = item.get('Solicitação')
        if solicitacao and str(solicitacao).strip():  # Verifica se não é None, vazio ou só espaços
            valid_data.append(item)
        else:
            invalid_records.append({
                'paciente': item.get('Paciente', 'N/A'),
                'procedimento': item.get('Procedimento', 'N/A'),
                'motivo': 'Número de solicitação inválido ou vazio'
            })
            print(f"Registro ignorado por ter solicitacao inválida: {item}")
    
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
            # Verificar quais solicitações já existem para identificar duplicatas
            solicitacoes_para_inserir = [item.get('Solicitação') for item in valid_data]
            
            # Query para verificar solicitações existentes
            cur.execute(
                "SELECT solicitacao, paciente FROM solicitacoes WHERE source_id = %s AND solicitacao = ANY(%s)",
                (source_id, solicitacoes_para_inserir)
            )
            existing_records = cur.fetchall()
            existing_solicitacoes = {record[0]: record[1] for record in existing_records}
            
            # Contar registros antes da inserção
            cur.execute("SELECT COUNT(*) FROM solicitacoes WHERE source_id = %s", (source_id,))
            count_before = cur.fetchone()[0]
            
            # O psycopg2.extras.execute_values é otimizado para inserções em lote
            # A constraint UNIQUE(source_id, solicitacao) já impede solicitações duplicadas
            extras.execute_values(
                cur,
                """
                INSERT INTO solicitacoes (
                    source_id, solicitacao, paciente, identificacao_paciente, procedimento, data_hora, celular_telefone,
                    classificacao_risco, situacao, observacao, profissional_solicitante, schedule
                ) VALUES %s
                ON CONFLICT (source_id, solicitacao) DO NOTHING;
                """,
                [
                    (
                        source_id,
                        item.get('Solicitação'), item.get('Paciente'), item.get('Identificação Paciente'), item.get('Procedimento'),
                        item.get('Data/Hora'), item.get('Celular/Telefone'), item.get('Classificação de Risco'),
                        item.get('Situação'), item.get('Observação'), item.get('Profissional'),
                        item.get('schedule')
                    ) for item in valid_data
                ]
            )
            
            # Contar registros após a inserção
            cur.execute("SELECT COUNT(*) FROM solicitacoes WHERE source_id = %s", (source_id,))
            count_after = cur.fetchone()[0]
            
            # Calcular quantos foram realmente inseridos
            inserted_count = count_after - count_before
            
            # Identificar registros duplicados
            duplicates = []
            for item in valid_data:
                solicitacao_num = item.get('Solicitação')
                if solicitacao_num in existing_solicitacoes:
                    duplicates.append({
                        'solicitacao': solicitacao_num,
                        'paciente': item.get('Paciente', 'N/A'),
                        'procedimento': item.get('Procedimento', 'N/A'),
                        'paciente_existente': existing_solicitacoes[solicitacao_num]
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
                print(f"{len(duplicates)} registros duplicados foram ignorados.")
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

