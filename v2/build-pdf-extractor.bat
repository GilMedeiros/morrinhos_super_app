@echo off
echo 🐍 Fazendo build do CSV Extractor...

:: Navegar para o diretório do CSV extractor
cd services\csv_extractor

:: Fazer build da imagem
docker build -t gilmedeiros/morrinhos-csv-extractor:latest .

:: Fazer push para Docker Hub
echo 📤 Enviando para Docker Hub...
docker push gilmedeiros/morrinhos-csv-extractor:latest

echo ✅ CSV Extractor enviado para Docker Hub!

cd ..\..

pause
