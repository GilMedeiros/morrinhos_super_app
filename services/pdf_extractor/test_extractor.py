#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de teste para verificar a função process_patient_data
"""

import sys
import os

# Adicionar o diretório app ao path para importar o módulo
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from extractor import process_patient_data

def test_patient_data_processing():
    """Testa diferentes formatos de dados de paciente"""
    
    test_cases = [
        # Padrão prioritário: número - nome (formato mais comum)
        ("73288 - THAIS BARBOSA PENA", "73288", "THAIS BARBOSA PENA"),
        ("12345 - JOÃO DA SILVA", "12345", "JOÃO DA SILVA"),
        ("987654321 - MARIA SANTOS COSTA", "987654321", "MARIA SANTOS COSTA"),
        ("456 - ANA PAULA", "456", "ANA PAULA"),
        ("789123456 – CARLOS EDUARDO", "789123456", "CARLOS EDUARDO"),
        
        # Caso com quebra de linha
        ("132955 - VIVIANE PERPETUO SOCORRO DOS\nPASSOS", "132955", "VIVIANE PERPETUO SOCORRO DOS PASSOS"),
        ("12345 - NOME COM\nQUEBRA DE LINHA", "12345", "NOME COM QUEBRA DE LINHA"),
        
        # Padrão secundário: número nome (sem hífen)
        ("123456 JOÃO DA SILVA", "123456", "JOÃO DA SILVA"),
        ("987 MARIA SANTOS", "987", "MARIA SANTOS"),
        
        # Padrão terciário: nome - número
        ("PEDRO OLIVEIRA - 654321", "654321", "PEDRO OLIVEIRA"),
        ("JOSÉ ROBERTO SILVA - 111222333", "111222333", "JOSÉ ROBERTO SILVA"),
        ("FERNANDA - 444555666", "444555666", "FERNANDA"),
        ("RICARDO ALMEIDA – 777888999", "777888999", "RICARDO ALMEIDA"),
        
        # Padrão quaternário: nome número (sem hífen)
        ("ANTONIO SILVA 555666", "555666", "ANTONIO SILVA"),
        
        # Casos especiais
        ("12", None, "12"),  # Número muito pequeno (< 3 dígitos)
        ("Ana", None, "Ana"),  # Só nome
        ("", None, None),  # Vazio
        (None, None, None),  # None
        ("MARIA JOSÉ DA SILVA", None, "MARIA JOSÉ DA SILVA"),  # Só nome completo
    ]
    
    print("=== Teste da função process_patient_data ===\n")
    
    for i, (input_text, expected_id, expected_name) in enumerate(test_cases, 1):
        result_id, result_name = process_patient_data(input_text)
        
        success = (result_id == expected_id and result_name == expected_name)
        status = "✅ PASSOU" if success else "❌ FALHOU"
        
        print(f"Teste {i}: {status}")
        print(f"  Input: '{input_text}'")
        print(f"  Esperado: ID='{expected_id}', Nome='{expected_name}'")
        print(f"  Resultado: ID='{result_id}', Nome='{result_name}'")
        print()

if __name__ == "__main__":
    test_patient_data_processing()
