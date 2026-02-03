#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste para validação de IDs únicos de paciente
"""

import sys
import os

# Adicionar o diretório app ao path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from database import insert_data, get_db_connection
import json

def test_unique_solicitation():
    """Testa se solicitações duplicadas são rejeitadas, mas IDs de paciente duplicados são permitidos"""
    
    # Dados de teste com solicitações duplicadas e IDs de paciente duplicados
    test_data = [
        {
            'Solicitação': 'SOL001',  # Solicitação única
            'Paciente': 'JOÃO DA SILVA',
            'Identificação Paciente': '123456',
            'Procedimento': 'Exame 1',
            'Data/Hora': '2025-08-01 10:00',
            'Celular/Telefone': '11999999999',
            'Classificação de Risco': 'Verde',
            'Situação': 'Agendado',
            'Observação': 'Primeira solicitação do paciente',
            'Profissional': 'Dr. Teste',
            'schedule': json.dumps(None)
        },
        {
            'Solicitação': 'SOL002',  # Solicitação única
            'Paciente': 'JOÃO DA SILVA',  # Mesmo paciente
            'Identificação Paciente': '123456',  # Mesmo ID (permitido)
            'Procedimento': 'Exame 2',
            'Data/Hora': '2025-08-01 11:00',
            'Celular/Telefone': '11999999999',
            'Classificação de Risco': 'Verde',
            'Situação': 'Agendado',
            'Observação': 'Segunda solicitação do mesmo paciente',
            'Profissional': 'Dr. Teste',
            'schedule': json.dumps(None)
        },
        {
            'Solicitação': 'SOL001',  # Solicitação duplicada (deve ser rejeitada)
            'Paciente': 'MARIA SANTOS',
            'Identificação Paciente': '789012',
            'Procedimento': 'Exame 3',
            'Data/Hora': '2025-08-01 12:00',
            'Celular/Telefone': '11888888888',
            'Classificação de Risco': 'Azul',
            'Situação': 'Agendado',
            'Observação': 'Solicitação com número duplicado',
            'Profissional': 'Dr. Teste',
            'schedule': json.dumps(None)
        }
    ]
    
    print("=== Teste de Validação de Solicitações Únicas ===\n")
    
    # Criar um source de teste
    from database import create_source
    source_id = create_source("Teste de solicitações únicas", 0, 'testing')
    
    if not source_id:
        print("❌ Erro ao criar source de teste")
        return
    
    print(f"Source de teste criado: {source_id}")
    
    # Tentar inserir os dados
    print("Inserindo dados de teste...")
    result = insert_data(test_data, source_id)
    
    if result:
        print("✅ Inserção concluída")
        
        # Verificar quantos registros foram realmente inseridos
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT COUNT(*) FROM solicitacoes WHERE source_id = %s",
                        (source_id,)
                    )
                    count = cur.fetchone()[0]
                    print(f"Registros inseridos no banco: {count} (esperado: 2)")
                    
                    # Verificar solicitações
                    cur.execute(
                        "SELECT solicitacao, paciente, identificacao_paciente FROM solicitacoes WHERE source_id = %s ORDER BY solicitacao",
                        (source_id,)
                    )
                    records = cur.fetchall()
                    
                    print("\nRegistros inseridos:")
                    for solicitacao, paciente, id_paciente in records:
                        print(f"  Solicitação: {solicitacao}, Paciente: {paciente}, ID: {id_paciente}")
                    
                    # Verificar se permitiu IDs de paciente duplicados
                    cur.execute(
                        "SELECT identificacao_paciente, COUNT(*) FROM solicitacoes WHERE source_id = %s AND identificacao_paciente = '123456' GROUP BY identificacao_paciente",
                        (source_id,)
                    )
                    result = cur.fetchone()
                    if result and result[1] == 2:
                        print("✅ IDs de paciente duplicados foram permitidos corretamente")
                    else:
                        print("❌ Problema com IDs de paciente duplicados")
                    
                    # Verificar se rejeitou solicitação duplicada
                    cur.execute(
                        "SELECT COUNT(*) FROM solicitacoes WHERE source_id = %s AND solicitacao = 'SOL001'",
                        (source_id,)
                    )
                    sol_count = cur.fetchone()[0]
                    if sol_count == 1:
                        print("✅ Solicitação duplicada foi rejeitada corretamente")
                    else:
                        print("❌ Problema com rejeição de solicitação duplicada")
                    
                    # Limpar dados de teste
                    cur.execute("DELETE FROM solicitacoes WHERE source_id = %s", (source_id,))
                    cur.execute("DELETE FROM sources WHERE id = %s", (source_id,))
                    conn.commit()
                    print(f"\n🧹 Dados de teste removidos")
                    
            finally:
                conn.close()
    else:
        print("❌ Erro na inserção")

if __name__ == "__main__":
    test_unique_solicitation()
