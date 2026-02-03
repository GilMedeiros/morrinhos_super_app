# 📨 Arquitetura Bidirecional: Envio e Recebimento de Mensagens

## 🔄 Visão Geral

O Dispatcher Service precisa lidar com **dois fluxos**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         REACH-TOWN                               │
│              (Sistema Principal de Campanhas)                    │
└─────────────────────────────────────────────────────────────────┘
    ▲                                                    │
    │                                                    │
    │ 3️⃣ Webhook: Nova mensagem                         │ 1️⃣ POST /v1/messages/send
    │ (recebimento)                                      │ (envio)
    │                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              DISPATCHER SERVICE (Microserviço)                   │
│                      Port: 3001                                  │
│                                                                  │
│  Endpoints:                                                      │
│  ├─ GET  /health                                                │
│  ├─ POST /v1/messages/send         ◄─── ENVIO                 │
│  ├─ POST /v1/webhooks/incoming     ◄─── RECEBIMENTO           │
│  └─ POST /v1/webhooks/status       ◄─── ATUALIZAÇÃO STATUS    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
    │                                         ▲
    │ 2️⃣ API HTTP                            │ 4️⃣ Callback/Webhook
    │ (envio)                                 │ (status/recebimento)
    ▼                                         │
┌─────────────────────────────────────────────────────────────────┐
│         WHATSAPP PROVIDER (Twilio, Evolution, etc)              │
│                                                                  │
│  - Envia mensagens                                              │
│  - Retorna IDs das mensagens                                    │
│  - Envia callbacks de status (entregue, lido)                  │
│  - Envia mensagens recebidas                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📤 FLUXO 1: ENVIO (Atual)

```
Usuário clica "Disparar"
       │
       ▼
reach-town busca contatos
       │
       ▼
Para cada contato:
  POST http://localhost:3001/v1/messages/send
  {
    "recipient_phone": "+5564999998888",
    "message_body": "Olá João!",
    "external_id": "campaign_5_contact_123"
  }
       │
       ▼
Dispatcher valida e chama Twilio API
       │
       ▼
Twilio retorna message_id
       │
       ▼
Dispatcher retorna ao reach-town:
{
  "status": "queued",
  "message_id": "msg-abc123",
  "provider_details": {
    "twilio_sid": "SM1234567890abcdef"
  }
}
       │
       ▼
reach-town armazena message_id no Supabase
```

---

## 📥 FLUXO 2: RECEBIMENTO (Novo)

```
Contato responde mensagem no WhatsApp
       │
       ▼
Twilio detecta resposta
       │
       ▼
Twilio faz HTTP POST para:
  POST http://reach-town-server.com/webhooks/whatsapp
  {
    "from": "+5564999998888",
    "body": "Oi! Tudo bem?",
    "message_id": "SM1234567890abcdef",
    "timestamp": "2025-11-26T00:30:00Z"
  }

⚠️ PROBLEMA: Twilio envia DIRETO para reach-town?
   Mas e se usarmos Evolution ou Baileys no futuro?
   Cada provider tem formatos diferentes!

   SOLUÇÃO: Twilio envia para Dispatcher!
```

### **Melhor Abordagem: Centralizar em Dispatcher**

```
Contato responde no WhatsApp
       │
       ▼
Twilio detecta resposta
       │
       ▼
Twilio faz HTTP POST para:
  POST http://dispatcher-server.com/v1/webhooks/incoming
  {
    "provider": "twilio",
    "from": "+5564999998888",
    "body": "Oi! Tudo bem?",
    "message_id": "SM1234567890abcdef",
    "timestamp": "2025-11-26T00:30:00Z"
  }
       │
       ▼
Dispatcher processa:
  ✅ Valida origem (vem do Twilio?)
  ✅ Normaliza dados (converte para formato padrão)
  ✅ Extrai informações
       │
       ▼
Dispatcher faz HTTP POST para reach-town:
  POST http://reach-town-server.com/api/webhooks/messages/incoming
  Headers: X-API-Key: reach-town-api-key
  {
    "from_phone": "+5564999998888",
    "message_text": "Oi! Tudo bem?",
    "provider_message_id": "SM1234567890abcdef",
    "provider": "twilio",
    "received_at": "2025-11-26T00:30:00Z"
  }
       │
       ▼
reach-town recebe e armazena:
  - Na tabela "messages"
  - Vincula ao contato
  - Cria notificação para usuário
```

---

## 📊 FLUXO 3: ATUALIZAÇÃO DE STATUS

```
Mensagem é entregue no WhatsApp
       │
       ▼
Twilio envia callback:
  POST http://dispatcher-server.com/v1/webhooks/status
  {
    "message_id": "SM1234567890abcdef",
    "status": "delivered",
    "timestamp": "2025-11-26T00:30:30Z"
  }
       │
       ▼
Dispatcher processa e atualiza:
  - Armazena status localmente (opcional)
       │
       ▼
Dispatcher notifica reach-town:
  POST http://reach-town-server.com/api/webhooks/messages/status
  Headers: X-API-Key: reach-town-api-key
  {
    "provider_message_id": "SM1234567890abcdef",
    "status": "delivered",
    "updated_at": "2025-11-26T00:30:30Z"
  }
       │
       ▼
reach-town atualiza status na tabela "messages"
       │
       ▼
reach-town atualiza UI em tempo real (websocket/polling)
```

---

## 🏗️ Estrutura Proposta para Dispatcher

```typescript
// src/controllers/WebhookController.ts

// 1️⃣ Receber mensagens do provider
POST /v1/webhooks/incoming
  - Normaliza dados do provider
  - Chama reach-town webhook
  - Armazena localmente (audit log)

// 2️⃣ Receber atualização de status
POST /v1/webhooks/status
  - Atualiza status local
  - Notifica reach-town
  - Registra timestamps

// 3️⃣ Enviar mensagens (já existe)
POST /v1/messages/send
  - Valida dados
  - Chama provider
  - Retorna message_id
```

---

## 📋 Novos Endpoints do Dispatcher

### Endpoint 1: Receber Mensagens Entrantes

```
POST /v1/webhooks/incoming
Content-Type: application/json
X-Webhook-Signature: {signature_for_validation}

{
  "provider": "twilio",
  "from": "+5564999998888",
  "body": "Oi! Tudo bem?",
  "message_id": "SM1234567890abcdef",
  "timestamp": "2025-11-26T00:30:00Z"
}
```

**O que faz:**
1. Valida origem (verifica assinatura do Twilio)
2. Normaliza dados
3. Chama reach-town em: `POST /api/webhooks/messages/incoming`
4. Armazena log (audit)

---

### Endpoint 2: Atualização de Status

```
POST /v1/webhooks/status
Content-Type: application/json
X-Webhook-Signature: {signature_for_validation}

{
  "provider": "twilio",
  "message_id": "SM1234567890abcdef",
  "status": "delivered",
  "timestamp": "2025-11-26T00:30:30Z"
}
```

**Status possíveis:**
- `queued` - Na fila
- `sending` - Enviando
- `sent` - Enviado
- `delivered` - Entregue
- `read` - Lido
- `failed` - Falhou
- `undelivered` - Não entregue

---

### Endpoint 3: Enviar Mensagens (Já Existe)

```
POST /v1/messages/send
X-API-Key: dev-api-key-12345
Content-Type: application/json

{
  "recipient_phone": "+5564999998888",
  "message_body": "Olá João!",
  "external_id": "campaign_5_contact_123"
}
```

---

## 🔐 Segurança de Webhooks

### Problema:
```
Qualquer pessoa poderia fazer POST para:
  /v1/webhooks/incoming
  /v1/webhooks/status

E enviar mensagens falsas para reach-town!
```

### Solução: Validação de Assinatura

**Como Twilio faz:**

```typescript
// Twilio envia:
X-Twilio-Signature: {signature}

// Dispatcher valida:
const token = process.env.TWILIO_AUTH_TOKEN;
const url = 'http://dispatcher.com/v1/webhooks/incoming';
const params = {...body}; // dados do request

const hash = crypto
  .createHmac('sha1', token)
  .update(url + new URLSearchParams(params))
  .digest('base64');

if (hash !== X-Twilio-Signature) {
  reject('Invalid signature');
}
```

---

## 🔄 Fluxo Completo (Timeline)

```
⏰ 10:00:00 - Usuário dispara campanha
  └─ reach-town → Dispatcher: "Envie para João"
     └─ Dispatcher → Twilio: "Envie mensagem"
        └─ Twilio → WhatsApp: Mensagem enviada

⏰ 10:00:05 - Twilio confirma entrega
  └─ Twilio → Dispatcher: "Mensagem entregue"
     └─ Dispatcher → reach-town: "Status: delivered"
        └─ reach-town → UI: Atualiza ícone ✓

⏰ 10:01:30 - João responde
  └─ WhatsApp → Twilio: "Oi! Tudo bem?"
     └─ Twilio → Dispatcher: "Mensagem recebida"
        └─ Dispatcher → reach-town: "Nova mensagem"
           └─ reach-town → UI: Notificação "João respondeu"
              └─ Usuário vê resposta no chat
```

---

## 📊 Banco de Dados Necessário

No `Supabase`, precisaremos de tabelas:

### Tabela: `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  direction VARCHAR(10), -- 'outgoing' or 'incoming'
  message_text TEXT,
  status VARCHAR(20), -- 'queued', 'sent', 'delivered', 'read', 'failed'
  
  -- Para rastreamento
  dispatcher_message_id VARCHAR(255), -- message_id do Dispatcher
  provider_message_id VARCHAR(255), -- ID do Twilio/Evolution/etc
  provider VARCHAR(50), -- 'twilio', 'evolution', 'baileys'
  
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Implementação em Fases

### **Fase 1 (Atual):** ✅ ENVIO APENAS
- reach-town → Dispatcher → Twilio
- Dispatcher retorna message_id
- reach-town armazena

### **Fase 2 (Próxima):** RECEBIMENTO
- Dispatcher ← Twilio (webhook)
- Dispatcher → reach-town (webhook)
- reach-town armazena mensagem recebida

### **Fase 3:** STATUS UPDATES
- Twilio → Dispatcher (callback de status)
- Dispatcher → reach-town (webhook)
- reach-town atualiza tabela

### **Fase 4:** CHAT BIDIRECIONAL
- UI mostra chat completo (envios e respostas)
- reach-town pode enviar respostas manualmente
- Sincronização em tempo real (websocket)

---

## 💡 Arquitetura Final (Visão Completa)

```
┌──────────────────────────────────────────────────────────────┐
│                        REACH-TOWN                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Frontend (React)                                      │  │
│  │  ├─ Campanhas                                          │  │
│  │  ├─ Chat (mensagens bidirecionais)                    │  │
│  │  └─ Estatísticas                                       │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Backend (Supabase)                                    │  │
│  │  ├─ Tabelas: campaigns, contacts, messages, users     │  │
│  │  └─ Webhooks: /api/webhooks/messages/*                │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         ▲              │
         │ Webhook      │ HTTP (envio)
         │ (recebimento)│
┌────────┴──────────────┴─────────────────────────────────────┐
│              DISPATCHER SERVICE                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                         │  │
│  │  ├─ POST /v1/messages/send                            │  │
│  │  ├─ POST /v1/webhooks/incoming                        │  │
│  │  └─ POST /v1/webhooks/status                          │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Provider Layer (Interface Pattern)                    │  │
│  │  ├─ MockProvider (desenvolvimento)                    │  │
│  │  ├─ TwilioProvider                                    │  │
│  │  ├─ EvolutionProvider                                 │  │
│  │  └─ BaileysProvider                                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP (Twilio, Evolution, etc)
┌──────────────┴──────────────────────────────────────────────┐
│            WHATSAPP PROVIDERS (Externos)                     │
│  ├─ Twilio                                                   │
│  ├─ Evolution                                                │
│  ├─ Baileys                                                  │
│  └─ Etc.                                                     │
└────────────────────────────────────────────────────────────┘
```

---

## 🔑 Pontos-Chave

1. **Dispatcher é central**: Toda comunicação passa por lá
2. **Abstração de provider**: Suporta múltiplos provedores
3. **Webhooks bidirecional**: Envio E recebimento
4. **Validação de assinatura**: Segurança contra spoofing
5. **Normalização**: Converte formatos diferentes para padrão
6. **Audit log**: Registra tudo para análise

---

## ❓ Fluxo com Twilio Específico

```
ENVIO:
  reach-town → Dispatcher: POST /v1/messages/send
  Dispatcher → Twilio API: curl -X POST https://api.twilio.com/...
  Twilio → Dispatcher: { sid: "SM123...", status: "queued" }
  Dispatcher → reach-town: { message_id: "msg-abc", status: "queued" }

RECEBIMENTO:
  WhatsApp User → Twilio: Envia resposta
  Twilio → Dispatcher: POST /v1/webhooks/incoming (callback)
  Dispatcher → reach-town: POST /api/webhooks/messages/incoming
  reach-town → Supabase: INSERT INTO messages

STATUS:
  Twilio → Dispatcher: POST /v1/webhooks/status (delivered)
  Dispatcher → reach-town: POST /api/webhooks/messages/status
  reach-town → Supabase: UPDATE messages SET status='delivered'
```

---

## ✅ Resumo

**Agora:**
- Dispatcher envia mensagens ✅

**Próximas:**
- Dispatcher recebe mensagens ❌
- Dispatcher atualiza status ❌
- reach-town processa webhooks ❌

Quer que eu implemente a **Fase 2 (Recebimento)**?

