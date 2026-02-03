@echo off
echo =================================
echo 🐳 EXECUTANDO PROJETO MORRINHOS NO DOCKER
echo =================================
echo.

echo 📋 Verificando se Docker esta funcionando...
docker --version
if %errorlevel% neq 0 (
    echo ❌ Docker nao encontrado. Verifique se o Docker Desktop esta rodando.
    pause
    exit /b 1
)

echo.
echo 🔨 Construindo imagens Docker...
docker-compose build
if %errorlevel% neq 0 (
    echo ❌ Erro ao construir imagens
    pause
    exit /b 1
)

echo.
echo 🚀 Iniciando servicos...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Erro ao iniciar servicos
    pause
    exit /b 1
)

echo.
echo ✅ Projeto iniciado com sucesso!
echo.
echo 📍 ACESSOS DISPONIVEIS:
echo   🌐 Aplicacao: http://localhost:3000
echo   🐘 PgAdmin: http://localhost:8080 (admin@morrinhos.com / admin123)
echo   ⚡ Redis Commander: http://localhost:8081
echo.
echo 📊 Para ver logs em tempo real:
echo   docker-compose logs -f
echo.
echo 🛑 Para parar os servicos:
echo   docker-compose down
echo.
pause
