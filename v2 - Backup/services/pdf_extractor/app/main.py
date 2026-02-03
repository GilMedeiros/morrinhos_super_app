from extractor import extract_devedores_from_pdf
from database import insert_extraction_data

def main():
    """
    Função principal que executa o processo de extração e inserção de dados.
    """
    pdf_file = 'seu_arquivo.pdf'  # Certifique-se de que o nome do arquivo está correto
    source_id = 1  # ID do source no banco (deve ser criado previamente)
    
    print("Iniciando a extração de dados do PDF...")
    devedores_data = extract_devedores_from_pdf(pdf_file)
    
    if devedores_data:
        print(f"Extração concluída. Total de {len(devedores_data)} registros encontrados.")
        print("Iniciando a inserção dos dados no banco de dados...")
        insert_extraction_data(devedores_data, source_id)
        print("Processo finalizado.")
    else:
        print("Nenhum dado foi extraído do PDF. O processo foi encerrado.")

if __name__ == '__main__':
    main()

