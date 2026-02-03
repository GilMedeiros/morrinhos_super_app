@echo off
echo Iniciando o processo de build e push da imagem Docker...
echo.

REM Defina seu nome de usuário do Docker Hub
set DOCKER_USERNAME=gilmedeiros

REM Defina o nome do repositório
set REPO_NAME=morrinhos-arrecadacao

REM Defina a versão (use a data atual para versão incremental)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set VERSION=v%datetime:~0,8%
set TAG=%VERSION%

echo Criando nova imagem com a tag: %DOCKER_USERNAME%/%REPO_NAME%:%TAG%
echo.

REM Faça o build da imagem
docker build -t %DOCKER_USERNAME%/%REPO_NAME%:%TAG% .

REM Também crie uma tag 'latest'
docker tag %DOCKER_USERNAME%/%REPO_NAME%:%TAG% %DOCKER_USERNAME%/%REPO_NAME%:latest

echo.
echo Imagem criada com sucesso!
echo.

REM Faça login no Docker Hub (será solicitada sua senha)
echo Fazendo login no Docker Hub...
docker login -u %DOCKER_USERNAME%

REM Envie as imagens para o Docker Hub
echo.
echo Enviando imagem com tag %TAG% para o Docker Hub...
docker push %DOCKER_USERNAME%/%REPO_NAME%:%TAG%

echo.
echo Enviando imagem com tag 'latest' para o Docker Hub...
docker push %DOCKER_USERNAME%/%REPO_NAME%:latest

echo.
echo Processo concluído! A imagem %DOCKER_USERNAME%/%REPO_NAME%:%TAG% foi enviada para o Docker Hub.
echo.

REM Atualizar o docker-compose.yml para usar a imagem do Docker Hub
echo Deseja atualizar o docker-compose.yml para usar a imagem do Docker Hub? (S/N)
set /p UPDATE_COMPOSE=

if /i "%UPDATE_COMPOSE%"=="S" (
    echo Atualizando docker-compose.yml...
    
    REM Crie um backup do arquivo original
    copy docker-compose.yml docker-compose.yml.bak
    
    REM Substitua a configuração 'build' pela 'image'
    powershell -Command "(Get-Content docker-compose.yml) -replace 'build: \.', 'image: %DOCKER_USERNAME%/%REPO_NAME%:latest' | Set-Content docker-compose.yml"
    
    echo docker-compose.yml atualizado! Um backup foi criado como docker-compose.yml.bak
)

echo.
echo Pressione qualquer tecla para sair...
pause > nul
