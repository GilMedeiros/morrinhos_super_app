import fitz  # PyMuPDF
import pandas as pd
import json
import re

def process_patient_data(patient_text):
    """
    Processa o texto da coluna paciente para separar o número de identificação do nome.
    Padrão esperado: "73288 - THAIS BARBOSA PENA"
    Retorna tuple (identificacao, nome_limpo)
    """
    if not patient_text or pd.isna(patient_text):
        return None, None
    
    # Normalizar o texto: remover quebras de linha e espaços extras
    patient_str = str(patient_text).strip()
    patient_str = re.sub(r'\s+', ' ', patient_str)  # Substitui múltiplos espaços/quebras por um espaço
    
    # Padrão prioritário: número seguido de hífen e nome (formato mais comum)
    # Ex: "73288 - THAIS BARBOSA PENA"
    pattern_number_dash_name = r'^(\d+)\s*[-–]\s*(.+)$'
    match = re.match(pattern_number_dash_name, patient_str)
    if match:
        identification, name = match.groups()
        return identification.strip(), name.strip()
    
    # Padrão secundário: número seguido diretamente por espaço e nome
    # Ex: "73288 THAIS BARBOSA PENA"
    pattern_number_space_name = r'^(\d+)\s+(.+)$'
    match = re.match(pattern_number_space_name, patient_str)
    if match:
        identification, name = match.groups()
        # Só aceita se o número tem pelo menos 3 dígitos para evitar falsos positivos
        if len(identification) >= 3:
            return identification.strip(), name.strip()
    
    # Padrão terciário: nome seguido de hífen e número
    # Ex: "THAIS BARBOSA PENA - 73288"
    pattern_name_dash_number = r'^(.+?)\s*[-–]\s*(\d+)$'
    match = re.match(pattern_name_dash_number, patient_str)
    if match:
        name, identification = match.groups()
        return identification.strip(), name.strip()
    
    # Padrão quaternário: nome seguido de espaço e número
    # Ex: "THAIS BARBOSA PENA 73288"
    pattern_name_space_number = r'^(.+)\s+(\d+)$'
    match = re.match(pattern_name_space_number, patient_str)
    if match:
        name, identification = match.groups()
        # Só aceita se o número tem pelo menos 3 dígitos
        if len(identification) >= 3:
            return identification.strip(), name.strip()
    
    # Se não encontrou padrão, retorna None para identificação e o texto original como nome
    return None, patient_str

def extract_requests_from_pdf(pdf_path):
    """
    Extrai tabelas de todas as páginas de um arquivo PDF e as converte em uma lista de dicionários.
    """
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Erro ao abrir o arquivo PDF: {e}")
        return []

    all_requests = []
    for page_num, page in enumerate(doc):
        # Encontra todas as tabelas na página
        tables = page.find_tables()
        table_list = list(tables)
        if table_list:
            print(f"Encontrada(s) {len(table_list)} tabela(s) na página {page_num + 1}.")
            for table in table_list:
                # Converte a tabela para um DataFrame do Pandas
                df = table.to_pandas()
                
                # Renomeia as colunas para facilitar o acesso
                df.columns = [
                    'Solicitação', 'Paciente', 'Procedimento', 'Data/Hora',
                    'Celular/Telefone', 'Classificação de Risco', 'Situação',
                    'Observação', 'Profissional'
                ]
                
                # Processa a coluna Paciente para separar identificação e nome
                patient_data = df['Paciente'].apply(process_patient_data)
                df['Identificação Paciente'] = patient_data.apply(lambda x: x[0] if x else None)
                df['Paciente'] = patient_data.apply(lambda x: x[1] if x else None)
                
                # Adiciona a coluna 'schedule' com um valor JSONB nulo por padrão
                df['schedule'] = json.dumps(None)
                
                # Converte o DataFrame para uma lista de dicionários e adiciona à lista principal
                all_requests.extend(df.to_dict('records'))
        else:
            print(f"Nenhuma tabela encontrada na página {page_num + 1}.")
            
    return all_requests

