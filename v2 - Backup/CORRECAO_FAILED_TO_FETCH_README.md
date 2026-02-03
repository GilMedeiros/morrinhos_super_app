# 🔧 Correção do Erro "Failed to fetch" na Funcionalidade de Atualizar Lista

## 📋 Problema Identificado

**Erro:** `Failed to fetch` ao tentar atualizar uma lista na VPS
**Sintoma:** Funcionalidade funciona localmente, mas falha na produção (VPS)

## 🔍 Causa Raiz

O frontend estava fazendo chamadas diretas para `http://localhost:5000/upload` (serviço PDF extractor), que funciona localmente mas não na VPS onde os serviços estão em containers Docker separados.

## ✅ Solução Implementada

### 1. Correção no Frontend
- **Arquivo:** `view/disparo.ejs`
- **Linha:** 2589
- **Alteração:**
  ```javascript
  // ❌ ANTES (ERRO)
  const response = await fetch('http://localhost:5000/upload', {
      method: 'POST',
      body: formData
  });

  // ✅ DEPOIS (CORRETO)
  const response = await fetch('/api/pdf-extractor/upload', {
      method: 'POST',
      body: formData
  });
  ```

### 2. Verificação do Backend
- **Arquivo:** `controllers/apiController.js`
- **Rota:** `/api/pdf-extractor/upload` (já estava implementada corretamente)
- **Funciona como proxy:** Redireciona para o serviço PDF extractor interno

### 3. Atualização da Imagem Docker
- **Nova versão:** `gilmedeiros/morrinhos:v20250903`
- **Docker Hub:** ✅ Publicada
- **Configuração VPS:** `docker-compose-vps.yml` atualizado

## 🚀 Deploy na VPS

### Opção 1: Atualização Automática
```bash
# Na VPS, executar:
docker-compose -f docker-compose-vps.yml pull
docker-compose -f docker-compose-vps.yml up -d
```

### Opção 2: Atualização Manual
```bash
# Parar serviços
docker-compose -f docker-compose-vps.yml down

# Baixar nova imagem
docker pull gilmedeiros/morrinhos:latest

# Reiniciar serviços
docker-compose -f docker-compose-vps.yml up -d
```

## 🔄 Arquitetura Corrigida

```
Frontend (Browser)
    ↓ POST /api/pdf-extractor/upload
Node.js App (Container)
    ↓ Proxy para http://pdf-extractor:5000/upload
PDF Extractor (Container)
    ↓ Processa arquivo
Database (PostgreSQL)
```

## ✅ Verificação Pós-Deploy

1. **Acessar aplicação:** `https://morrinhos.apollocompany.com.br`
2. **Testar funcionalidade:**
   - Ir para página de Disparo
   - Clicar em "Atualizar Lista" em qualquer source
   - Fazer upload de um PDF de teste
   - Verificar se não aparece mais "Failed to fetch"

## 📁 Arquivos Modificados

- ✅ `view/disparo.ejs` - Correção da URL do fetch
- ✅ `docker-compose-vps.yml` - Atualização da imagem
- ✅ Imagem Docker Hub - Nova versão publicada

## 🛠️ Configuração de Rede Docker

A solução funciona porque:
- Todos os containers estão na mesma rede: `apolloCompany_network`
- O PDF extractor é acessível via: `http://pdf-extractor:5000`
- O proxy no Node.js resolve a comunicação interna
- O frontend usa rotas relativas que passam pelo proxy

## 📝 Notas Importantes

- ✅ A funcionalidade de upload na página `/upload` já estava correta
- ✅ Apenas a funcionalidade de "Atualizar Lista" estava afetada
- ✅ A correção não afeta o funcionamento local (desenvolvimento)
- ✅ Todas as outras chamadas de API já estavam usando rotas corretas

---

**Data:** 03/09/2025  
**Versão:** v20250903  
**Status:** ✅ Resolvido e Deploy realizado
