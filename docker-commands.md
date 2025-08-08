# 🐳 Comandos para rodar o projeto no Docker

## 1. Verificar se Docker está funcionando
docker --version
docker compose --version

## 2. Construir as imagens
docker compose build

## 3. Subir todos os serviços
docker compose up -d

## 4. Verificar se está funcionando
docker compose ps

## 5. Ver logs em tempo real
docker compose logs -f

## 6. Testar a aplicação
# Abra no navegador: http://localhost:3000

## 7. Comandos úteis

# Parar todos os serviços
docker compose down

# Reiniciar apenas a aplicação
docker compose restart app

# Ver logs de um serviço específico
docker compose logs app
docker compose logs postgres
docker compose logs redis

# Entrar no container da aplicação
docker compose exec app sh

# Entrar no PostgreSQL
docker compose exec postgres psql -U postgres -d morrinhos

# Entrar no Redis
docker compose exec redis redis-cli

## 8. Interfaces de administração

# PgAdmin (PostgreSQL): http://localhost:8080
# Email: admin@morrinhos.com
# Senha: admin123

# Redis Commander: http://localhost:8081

## 9. Endpoints da API para testar

# Status da API
curl http://localhost:3000/api

# Health check
curl http://localhost:3000/api/health

# Listar usuários
curl http://localhost:3000/api/users

# Criar usuário
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva", "email": "joao@exemplo.com"}'
