# 🐍 Correção do Serviço PDF Extractor na VPS

## 📋 Problema Identificado

O serviço `pdf-extractor` (Python/Flask) não estava subindo na VPS, causando o erro "Failed to fetch" na funcionalidade de atualizar lista.

## ✅ Soluções Implementadas

### 1. Nova Imagem Docker
- **Criada:** `gilmedeiros/morrinhos-pdf-extractor:latest`
- **Substituiu:** `gilmedeiros/mr_pdf_extractor:alpha.1.2`
- **Status:** ✅ Enviada para Docker Hub

### 2. Configuração Atualizada
- **Arquivo:** `docker-compose-vps.yml`
- **Alteração:** Atualizada imagem do PDF extractor
- **Adicionado:** `restart: unless-stopped`

## 🚀 Comandos para Atualizar na VPS

### Opção 1: Atualização Completa
```bash
# Baixar novas imagens
docker-compose -f docker-compose-vps.yml pull

# Reiniciar todos os serviços
docker-compose -f docker-compose-vps.yml up -d
```

### Opção 2: Apenas PDF Extractor
```bash
# Baixar nova imagem do PDF extractor
docker pull gilmedeiros/morrinhos-pdf-extractor:latest

# Reiniciar apenas o PDF extractor
docker-compose -f docker-compose-vps.yml up -d pdf-extractor
```

## 🔍 Verificações na VPS

### 1. Status dos Containers
```bash
docker-compose -f docker-compose-vps.yml ps
```

**Resultado esperado:**
```
NAME                           COMMAND                  SERVICE         STATUS         PORTS
project_app_1                 "docker-entrypoint.s…"   app             running        
project_pdf-extractor_1       "python app/app.py"      pdf-extractor   running        
project_redis_1               "docker-entrypoint.s…"   redis           running        
```

### 2. Logs do PDF Extractor
```bash
docker-compose -f docker-compose-vps.yml logs pdf-extractor
```

**Resultado esperado:**
```
pdf-extractor_1  | INFO:__main__:Iniciando PDF Extractor API na porta 5000
pdf-extractor_1  | * Running on all addresses (0.0.0.0)
pdf-extractor_1  | * Running on http://127.0.0.1:5000
```

### 3. Teste de Conectividade
```bash
# Entrar no container da aplicação principal
docker-compose -f docker-compose-vps.yml exec app sh

# Testar conectividade com PDF extractor
wget -q -O - http://pdf-extractor:5000/health || curl http://pdf-extractor:5000/health
```

### 4. Teste da Funcionalidade
1. Acessar aplicação web
2. Ir para página de Disparo
3. Clicar em "Atualizar Lista"
4. Fazer upload de um PDF
5. Verificar logs no console (F12)

## 🏗️ Arquitetura Corrigida

```
Frontend (Browser)
    ↓ POST /api/pdf-extractor/upload
Node.js App (Container: app)
    ↓ Proxy para http://pdf-extractor:5000/upload
PDF Extractor (Container: pdf-extractor) ← ✅ AGORA FUNCIONANDO
    ↓ Processa arquivo
Database (PostgreSQL - VPS)
```

## 📁 Arquivos Atualizados

- ✅ `docker-compose-vps.yml` - Nova imagem do PDF extractor
- ✅ `build-pdf-extractor.bat/sh` - Scripts para build do PDF extractor
- ✅ Imagem Docker Hub - `gilmedeiros/morrinhos-pdf-extractor:latest`

## 🐛 Problemas Anteriores

1. **Imagem não encontrada:** `gilmedeiros/mr_pdf_extractor:alpha.1.2` não existia
2. **Serviço não iniciava:** Container não conseguia subir
3. **Sem restart policy:** Container não reiniciava automaticamente

## ✅ Verificação Final

Após atualizar na VPS, a funcionalidade de "Atualizar Lista" deve:
- ✅ Não mostrar mais "Failed to fetch"
- ✅ Exibir logs detalhados no console
- ✅ Processar arquivos PDF corretamente
- ✅ Inserir dados no banco

---

**Data:** 03/09/2025  
**Status:** ✅ PDF Extractor corrigido e pronto para deploy  
**Próximo Passo:** Atualizar VPS e testar funcionalidade
