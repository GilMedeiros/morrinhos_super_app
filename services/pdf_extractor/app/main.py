from extractor import extract_requests_from_pdf
from database import insert_data

def main():
    """
    Função principal que executa o processo de extração e inserção de dados.
    """
    pdf_file = 'seu_arquivo.pdf'  # Certifique-se de que o nome do arquivo está correto
    
    print("Iniciando a extração de dados do PDF...")
    requests_data = extract_requests_from_pdf(pdf_file)
    
    if requests_data:
        print(f"Extração concluída. Total de {len(requests_data)} registros encontrados.")
        print("Iniciando a inserção dos dados no banco de dados...")
        insert_data(requests_data)
        print("Processo finalizado.")
    else:
        print("Nenhum dado foi extraído do PDF. O processo foi encerrado.")

if __name__ == '__main__':
    main()

