import fitz  # PyMuPDF
import pandas as pd
import json
import re

def process_contribuinte_data(contribuinte_text):
    """
    Processa o texto da coluna contribuinte para limpar e padronizar.
    Remove quebras de linha e espaços extras.
    """
    if not contribuinte_text or pd.isna(contribuinte_text):
        return None
    
    # Normalizar o texto: remover quebras de linha e espaços extras
    contribuinte_str = str(contribuinte_text).strip()
    contribuinte_str = re.sub(r'\s+', ' ', contribuinte_str)  # Substitui múltiplos espaços/quebras por um espaço
    
    return contribuinte_str

def process_valor_devido(valor_text):
    """
    Processa o valor devido convertendo de string para numeric.
    Espera formato brasileiro: R$ 2.572.371,44
    """
    if not valor_text or pd.isna(valor_text):
        return None
    
    valor_str = str(valor_text).strip()
    
    # Remover "R$", espaços e converter vírgula para ponto
    valor_str = re.sub(r'R\$?\s*', '', valor_str)  # Remove R$ e espaços
    valor_str = valor_str.replace('.', '')  # Remove pontos (milhares)
    valor_str = valor_str.replace(',', '.')  # Troca vírgula por ponto (decimais)
    
    try:
        return float(valor_str)
    except ValueError:
        print(f"Erro ao converter valor: {valor_text}")
        return None

def is_valid_devedor_row(row):
    """
    Verifica se uma linha contém dados válidos de devedor.
    Filtra linhas de totalizador, cabeçalho e outras linhas inválidas.
    """
    # Verificar se é uma linha válida
    ccp = str(row.get('CCP', '')).strip()
    contribuinte = str(row.get('CONTRIBUINTE', '')).strip()
    
    # Filtros para identificar linhas inválidas
    invalid_patterns = [
        r'^QUANTIDADE:',  # Linha de quantidade
        r'^TOTAL:',       # Linha de total
        r'QUANTIDADE:\s*\d+\s*TOTAL:',  # Linha combinada quantidade/total
        r'^CCP$',         # Cabeçalho da tabela
        r'^CONTRIBUINTE$', # Cabeçalho da tabela
        r'^\s*$',         # Linhas vazias
        r'^-+$',          # Linhas com apenas traços
    ]
    
    # Verificar se o CCP ou CONTRIBUINTE contêm padrões inválidos
    for pattern in invalid_patterns:
        if re.search(pattern, ccp, re.IGNORECASE) or re.search(pattern, contribuinte, re.IGNORECASE):
            print(f"Linha filtrada - CCP: '{ccp}', CONTRIBUINTE: '{contribuinte}'")
            return False
    
    # Verificar se tem pelo menos CCP OU CONTRIBUINTE válidos
    if not ccp or ccp.lower() in ['nan', 'none', ''] or not contribuinte or contribuinte.lower() in ['nan', 'none', '']:
        if not (ccp and len(ccp) > 0 and ccp not in ['nan', 'none']) and not (contribuinte and len(contribuinte) > 0 and contribuinte not in ['nan', 'none']):
            print(f"Linha filtrada por dados insuficientes - CCP: '{ccp}', CONTRIBUINTE: '{contribuinte}'")
            return False
    
    return True

def extract_devedores_from_pdf(pdf_path):
    """
    Extrai tabelas de devedores de todas as páginas de um arquivo PDF e as converte em uma lista de dicionários.
    """
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Erro ao abrir o arquivo PDF: {e}")
        return []

    all_devedores = []
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
                    'CCP', 'CONTRIBUINTE', 'CELULAR', 'PROCESSO(S)', 'VALOR DEVIDO'
                ]
                
                # Processa os dados
                df['CONTRIBUINTE'] = df['CONTRIBUINTE'].apply(process_contribuinte_data)
                df['VALOR DEVIDO'] = df['VALOR DEVIDO'].apply(process_valor_devido)
                
                # Filtra linhas válidas de devedores (remove totalizadores, cabeçalhos, etc.)
                valid_rows = []
                for _, row in df.iterrows():
                    if is_valid_devedor_row(row):
                        valid_rows.append(row.to_dict())
                    
                # Adiciona campos padrão apenas para linhas válidas
                for row in valid_rows:
                    row['status'] = 'ativo'
                
                # Adiciona apenas linhas válidas à lista principal
                all_devedores.extend(valid_rows)
        else:
            print(f"Nenhuma tabela encontrada na página {page_num + 1}.")
            
    return all_devedores

