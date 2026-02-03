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
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    # Detectar colunas e ler linhas
    with open(filepath, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        columns = reader.fieldnames
        rows = list(reader)

    row_count = len(rows)
    original_structure = json.dumps(columns)
    processed_at = datetime.utcnow()
    status = 'processing'

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Inserir registro em csv_files
                cur.execute(
                    """
                    INSERT INTO csv_files (filename, original_structure, processed_at, row_count, status)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (filename, original_structure, processed_at, row_count, status)
                )
                file_id = cur.fetchone()[0]

                # Inserir cada linha em csv_data
                for idx, row in enumerate(rows, start=1):
                    cur.execute(
                        """
                        INSERT INTO csv_data (file_id, data, created_at, row_number)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (file_id, json.dumps(row), processed_at, idx)
                    )

                # Atualizar status para 'completed' e row_count
                cur.execute(
                    """
                    UPDATE csv_files SET status = %s, row_count = %s WHERE id = %s
                    """,
                    ('completed', row_count, file_id)
                )
            conn.commit()
    except Exception as e:
        # Em caso de erro, atualizar status para 'error'
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE csv_files SET status = %s WHERE filename = %s",
                    ('error', filename)
                )
            conn.commit()
        return jsonify({'status': 'error', 'message': str(e)}), 500

    return jsonify({'status': 'success', 'file_id': file_id, 'columns': columns, 'rows_inserted': row_count})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
