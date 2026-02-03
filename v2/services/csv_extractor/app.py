import os
import csv
import json
import psycopg2
from datetime import datetime
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Configuração do banco (ajuste conforme necessário)
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'dbname': os.getenv('POSTGRES_DB', 'morrinhos_arrecadacao'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', 'postgres')
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

@app.route('/extract-csv', methods=['POST'])
def extract_csv():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'Nome do arquivo não pode ser vazio'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        # Detectar colunas e ler linhas
        with open(filepath, mode='r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            columns = reader.fieldnames
            
            # --- INÍCIO DA MODIFICAÇÃO ---
            # Validação para verificar se as colunas obrigatórias existem
            required_columns = {'nome', 'telefone'}
            if not required_columns.issubset(set(columns)):
                missing = required_columns - set(columns)
                return jsonify({
                    'status': 'error',
                    'message': f'O arquivo não contém as colunas obrigatórias: {", ".join(missing)}'
                }), 400
            # --- FIM DA MODIFICAÇÃO ---

            rows = list(reader)

        row_count = len(rows)
        original_structure = json.dumps(columns)
        created_at = datetime.utcnow()
        status = 'pending'
        source_id = None

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Inserir registro em sources
                cur.execute(
                    """
                    INSERT INTO sources (filename, original_structure, created_at, row_count, status)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (filename, original_structure, created_at, row_count, status)
                )
                source_id = cur.fetchone()[0]

                # Inserir cada linha em extraction_results
                for idx, row in enumerate(rows, start=1):
                    cur.execute(
                        """
                        INSERT INTO extraction_results (source_id, data, created_at, row_number)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (source_id, json.dumps(row), created_at, idx)
                    )

                # Atualizar status para 'completed'
                cur.execute(
                    "UPDATE sources SET status = %s WHERE id = %s",
                    ('completed', source_id)
                )
            conn.commit()

    except Exception as e:
        # Em caso de erro, atualizar status para 'error' se o source_id foi criado
        if source_id:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE sources SET status = %s WHERE id = %s",
                        ('error', source_id)
                    )
                conn.commit()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        # Garante que o arquivo enviado seja removido após o processamento
        if os.path.exists(filepath):
            os.remove(filepath)

    return jsonify({'status': 'success', 'file_id': source_id, 'columns': columns, 'rows_inserted': row_count})


@app.route('/health', methods=['GET'])
def health():
    """Health endpoint used by docker-compose and orchestration to verify service liveness."""
    return jsonify({'status': 'ok', 'service': 'csv-extractor', 'timestamp': datetime.utcnow().isoformat()}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)

