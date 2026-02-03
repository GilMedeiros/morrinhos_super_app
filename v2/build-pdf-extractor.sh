#!/bin/bash

echo "🐍 Fazendo build do PDF Extractor..."

# Navegar para o diretório do PDF extractor
cd services/pdf_extractor

# Fazer build da imagem
docker build -t gilmedeiros/morrinhos-pdf-extractor:latest .

# Fazer push para Docker Hub
echo "📤 Enviando para Docker Hub..."
docker push gilmedeiros/morrinhos-pdf-extractor:latest

echo "✅ PDF Extractor enviado para Docker Hub!"

cd ../..
