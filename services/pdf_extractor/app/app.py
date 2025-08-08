import os
import tempfile
import fitz  # PyMuPDF - para verificar páginas do PDF
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from extractor import extract_requests_from_pdf
from database import insert_data, create_source, update_source_items_count, get_db_connection
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Permite requests do frontend

# Configurações
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {'pdf'}
MAX_PDF_PAGES = int(os.getenv('MAX_PDF_PAGES', '40'))
UPLOAD_FOLDER = tempfile.gettempdir()

def allowed_file(filename):
    """Verifica se o arquivo tem extensão permitida"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def check_pdf_page_limit(pdf_path):
    """
    Verifica se o PDF está dentro do limite de páginas permitido.
    Retorna (is_valid, page_count, error_message)
    """
    try:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        doc.close()
        
        if page_count > MAX_PDF_PAGES:
            return False, page_count, f"PDF tem {page_count} páginas. Limite máximo: {MAX_PDF_PAGES} páginas"
        
        return True, page_count, None
        
    except Exception as e:
        return False, 0, f"Erro ao verificar páginas do PDF: {str(e)}"

@app.route('/', methods=['GET'])
def index():
    """Endpoint principal"""
    return jsonify({
        'status': 'success',
        'service': 'PDF Extractor API',
        'version': '1.0.0',
        'limits': {
            'max_file_size': '50MB',
            'max_pages': MAX_PDF_PAGES,
            'allowed_extensions': list(ALLOWED_EXTENSIONS)
        },
        'endpoints': {
            'upload': '/upload',
            'health': '/health',
            'status': '/status',
            'sources': '/sources',
            'solicitacoes': '/solicitacoes'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check"""
    return jsonify({
        'status': 'ok',
        'service': 'PDF Extractor API',
        'version': '1.0.0'
    })

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """Endpoint para upload e processamento de PDF"""
    try:
        # Verificar se foi enviado um arquivo
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'Nenhum arquivo PDF foi enviado'
            }), 400

        file = request.files['file']
        
        # Verificar se arquivo foi selecionado
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'Nenhum arquivo foi selecionado'
            }), 400

        # Verificar extensão do arquivo
        if not allowed_file(file.filename):
            return jsonify({
                'status': 'error',
                'message': 'Apenas arquivos PDF são permitidos'
            }), 400

        # Salvar arquivo temporariamente
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(temp_path)

        logger.info(f"Arquivo PDF salvo temporariamente: {temp_path}")

        try:
            # Verificar limite de páginas do PDF
            logger.info("Verificando limite de páginas do PDF...")
            is_valid, page_count, error_message = check_pdf_page_limit(temp_path)
            
            if not is_valid:
                logger.warning(f"PDF rejeitado: {error_message}")
                return jsonify({
                    'status': 'error',
                    'message': error_message,
                    'page_count': page_count,
                    'max_pages_allowed': MAX_PDF_PAGES
                }), 400
            
            logger.info(f"PDF aprovado: {page_count} páginas (limite: {MAX_PDF_PAGES})")

            # Extrair dados do PDF
            logger.info("Iniciando extração de dados do PDF...")
            requests_data = extract_requests_from_pdf(temp_path)

            if not requests_data:
                return jsonify({
                    'status': 'warning',
                    'message': 'Nenhum dado foi encontrado no PDF',
                    'extracted_count': 0
                }), 200

            logger.info(f"Extração concluída. {len(requests_data)} registros encontrados")

            # Verificar se é uma atualização de source existente
            source_id_param = request.form.get('sourceId')
            
            if source_id_param:
                # Atualização de source existente
                logger.info(f"Atualizando source existente: {source_id_param}")
                source_id = int(source_id_param)
                
                # Verificar se o source existe
                conn = get_db_connection()
                if conn:
                    try:
                        with conn.cursor() as cur:
                            cur.execute("SELECT nome FROM sources WHERE id = %s", (source_id,))
                            source_result = cur.fetchone()
                            
                            if not source_result:
                                return jsonify({
                                    'status': 'error',
                                    'message': f'Source com ID {source_id} não encontrado'
                                }), 404
                            
                            source_name = source_result[0]
                            logger.info(f"Source encontrado: {source_name}")
                            
                    finally:
                        conn.close()
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Erro ao conectar com o banco de dados'
                    }), 500
            else:
                # Criar novo source
                logger.info(f"Criando novo source para o arquivo: {filename}")
                source_id = create_source(filename, len(requests_data), 'pending')
                
                if not source_id:
                    return jsonify({
                        'status': 'error',
                        'message': 'Erro ao criar registro do source'
                    }), 500

            # Inserir dados no banco
            logger.info("Inserindo dados no banco de dados...")
            insert_result = insert_data(requests_data, source_id)
            
            if not insert_result['success']:
                return jsonify({
                    'status': 'error',
                    'message': 'Erro ao inserir dados no banco'
                }), 500
            
            # Atualizar quantidade de itens no source
            conn = get_db_connection()
            if conn:
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE sources SET quantidade_itens = %s WHERE id = %s",
                            (insert_result['total_in_source'], source_id)
                        )
                        conn.commit()
                finally:
                    conn.close()

            # Preparar mensagem de resposta
            response_message = 'PDF processado com sucesso'
            registros_inseridos = insert_result['inserted_count']
            
            if source_id_param:
                if registros_inseridos > 0:
                    response_message = f'Lista atualizada com sucesso! {registros_inseridos} novos registros adicionados.'
                else:
                    response_message = 'Lista processada. Nenhum registro novo foi adicionado (todos os registros já existiam).'
            
            # Preparar informações sobre duplicatas e registros inválidos
            warnings = []
            if insert_result['duplicates']:
                warnings.append({
                    'type': 'duplicates',
                    'count': len(insert_result['duplicates']),
                    'message': f'{len(insert_result["duplicates"])} registros já existiam na lista e foram ignorados',
                    'details': insert_result['duplicates']
                })
            
            if insert_result['invalid_records']:
                warnings.append({
                    'type': 'invalid',
                    'count': len(insert_result['invalid_records']),
                    'message': f'{len(insert_result["invalid_records"])} registros eram inválidos e foram ignorados',
                    'details': insert_result['invalid_records']
                })

            return jsonify({
                'status': 'success',
                'message': response_message,
                'extracted_count': len(requests_data),
                'registros_inseridos': registros_inseridos,
                'total_registros_fonte': insert_result['total_in_source'],
                'warnings': warnings,
                'filename': filename,
                'source_id': source_id,
                'page_count': page_count,
                'max_pages_allowed': MAX_PDF_PAGES,
                'is_update': bool(source_id_param)
            }), 200

        except Exception as e:
            logger.error(f"Erro no processamento: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Erro ao processar PDF: {str(e)}'
            }), 500

        finally:
            # Limpar arquivo temporário
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    logger.info(f"Arquivo temporário removido: {temp_path}")
            except Exception as e:
                logger.warning(f"Erro ao remover arquivo temporário: {str(e)}")

    except RequestEntityTooLarge:
        return jsonify({
            'status': 'error',
            'message': 'Arquivo muito grande. Tamanho máximo: 50MB'
        }), 413

    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Erro interno do servidor: {str(e)}'
        }), 500

@app.route('/status', methods=['GET'])
def check_database_status():
    """Verifica o status da conexão com o banco de dados"""
    try:
        conn = get_db_connection()
        if conn:
            conn.close()
            return jsonify({
                'status': 'ok',
                'database': 'connected'
            })
        else:
            return jsonify({
                'status': 'error',
                'database': 'disconnected'
            }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'database': 'error',
            'message': str(e)
        }), 500

@app.route('/solicitacoes', methods=['GET'])
def get_solicitacoes():
    """Endpoint para buscar solicitações do banco"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'status': 'error',
                'message': 'Erro na conexão com banco de dados'
            }), 500

        with conn.cursor() as cur:
            cur.execute("""
                SELECT s.id, s.solicitacao, s.paciente, s.procedimento, s.data_hora, 
                       s.celular_telefone, s.classificacao_risco, s.situacao, 
                       s.observacao, s.profissional_solicitante, s.created_at,
                       src.id as source_id, src.nome as source_nome, src.data_upload
                FROM solicitacoes s
                JOIN sources src ON s.source_id = src.id
                ORDER BY s.created_at DESC 
                LIMIT 100
            """)
            
            columns = [desc[0] for desc in cur.description]
            results = []
            
            for row in cur.fetchall():
                row_dict = dict(zip(columns, row))
                # Converter datetime para string se necessário
                if row_dict.get('created_at'):
                    row_dict['created_at'] = row_dict['created_at'].isoformat()
                if row_dict.get('data_upload'):
                    row_dict['data_upload'] = row_dict['data_upload'].isoformat()
                results.append(row_dict)
            
            return jsonify({
                'status': 'success',
                'data': results,
                'count': len(results)
            })

    except Exception as e:
        logger.error(f"Erro ao buscar solicitações: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Erro ao buscar solicitações: {str(e)}'
        }), 500
    finally:
        if conn:
            conn.close()

@app.route('/sources', methods=['GET'])
def get_sources():
    """Endpoint para buscar sources (PDFs processados)"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'status': 'error',
                'message': 'Erro na conexão com banco de dados'
            }), 500

        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, nome, data_upload, quantidade_itens, status, created_at
                FROM sources 
                ORDER BY data_upload DESC
            """)
            
            columns = [desc[0] for desc in cur.description]
            results = []
            
            for row in cur.fetchall():
                row_dict = dict(zip(columns, row))
                # Converter datetime para string se necessário
                if row_dict.get('data_upload'):
                    row_dict['data_upload'] = row_dict['data_upload'].isoformat()
                if row_dict.get('created_at'):
                    row_dict['created_at'] = row_dict['created_at'].isoformat()
                results.append(row_dict)
            
            return jsonify({
                'status': 'success',
                'data': results,
                'count': len(results)
            })

    except Exception as e:
        logger.error(f"Erro ao buscar sources: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@app.route('/sources/<int:source_id>/solicitacoes', methods=['GET'])
def get_solicitacoes_by_source(source_id):
    """Endpoint para buscar solicitações de um source específico"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'status': 'error',
                'message': 'Erro na conexão com banco de dados'
            }), 500

        with conn.cursor() as cur:
            # Primeiro buscar informações do source
            cur.execute("""
                SELECT id, nome, data_upload, quantidade_itens, status
                FROM sources 
                WHERE id = %s
            """, (source_id,))
            
            source_row = cur.fetchone()
            if not source_row:
                return jsonify({
                    'status': 'error',
                    'message': 'Source não encontrado'
                }), 404
            
            source_columns = [desc[0] for desc in cur.description]
            source_info = dict(zip(source_columns, source_row))
            if source_info.get('data_upload'):
                source_info['data_upload'] = source_info['data_upload'].isoformat()
            
            # Buscar solicitações do source
            cur.execute("""
                SELECT id, solicitacao, paciente, procedimento, data_hora, 
                       celular_telefone, classificacao_risco, situacao, 
                       observacao, profissional_solicitante, status, created_at
                FROM solicitacoes 
                WHERE source_id = %s
                ORDER BY created_at DESC
            """, (source_id,))
            
            columns = [desc[0] for desc in cur.description]
            solicitacoes = []
            
            for row in cur.fetchall():
                row_dict = dict(zip(columns, row))
                if row_dict.get('created_at'):
                    row_dict['created_at'] = row_dict['created_at'].isoformat()
                solicitacoes.append(row_dict)
            
            return jsonify({
                'status': 'success',
                'source': source_info,
                'solicitacoes': solicitacoes,
                'count': len(solicitacoes)
            })

    except Exception as e:
        logger.error(f"Erro ao buscar solicitações do source {source_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'status': 'error',
        'message': 'Arquivo muito grande. Tamanho máximo permitido: 50MB'
    }), 413

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'status': 'error',
        'message': 'Erro interno do servidor'
    }), 500

@app.route('/status', methods=['GET'])
def database_status():
    """Endpoint para verificar status da conexão com banco"""
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
            conn.close()
            
            return jsonify({
                'status': 'success',
                'database': 'connected',
                'message': 'Conexão com PostgreSQL está funcionando'
            })
        else:
            return jsonify({
                'status': 'error',
                'database': 'disconnected',
                'message': 'Não foi possível conectar ao PostgreSQL'
            }), 500
            
    except Exception as e:
        logger.error(f"Erro ao verificar banco: {str(e)}")
        return jsonify({
            'status': 'error',
            'database': 'error',
            'message': f'Erro ao verificar conexão: {str(e)}'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Iniciando PDF Extractor API na porta {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
