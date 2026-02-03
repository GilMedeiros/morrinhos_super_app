# 📋 Detalhamento Completo do Dispatcher Service

## 🎯 Objetivo

O **Dispatcher Service** é um microserviço independente responsável por:
- ✅ Receber requisições de envio de mensagens de WhatsApp
- ✅ Validar dados de entrada
- ✅ Encaminhar para o provedor de WhatsApp (atualmente mock, futuramente real)
- ✅ Retornar status do envio

---

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    REACH-TOWN (Frontend)                     │
│              Sistema principal de campanhas                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                    1️⃣ Usuario clica em
                    "Iniciar Disparo"
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│          REACH-TOWN (Backend/Supabase)                       │
│  - Busca contatos da campanha                              │
│  - Para cada contato, chama o Dispatcher Service           │
│  - Armazena status dos envios                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                    2️⃣ HTTP POST
                    /v1/messages/send
                    + API Key
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│      DISPATCHER SERVICE (Microserviço)                       │
│      - Express.js rodando na porta 3001                    │
│      - Recebe requisição                                    │
│      - Valida dados                                         │
│      - Chama o provedor (Mock ou Real)                     │
│      - Retorna message_id único                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                    3️⃣ Mock Provider
                    (agora) ou Real
                    (futuramente)
                         │
                         ▼
              WhatsApp API (externa)
              - Twilio
              - Evolution
              - Baileys
              - Etc.
```

---

## 📡 Endpoints Disponíveis

### 1️⃣ Health Check (Público - Sem Autenticação)

**Endpoint:**
```
GET /health
```

**Propósito:** Verificar se o serviço está rodando

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T00:29:15.298Z"
}
```

**Status HTTP:** `200 OK`

**Exemplo com cURL:**
```bash
curl http://localhost:3001/health
```

---

### 2️⃣ Enviar Mensagem (Protegido - Requer API Key)

**Endpoint:**
```
POST /v1/messages/send
```

**Headers Obrigatórios:**
```
X-API-Key: dev-api-key-12345
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "recipient_phone": "+5564999998888",
  "message_body": "Olá! Esta é uma mensagem de teste.",
  "external_id": "campaign_123_contact_456"
}
```

**Campos:**
- `recipient_phone` (string, obrigatório): Telefone do destinatário em formato internacional (+55...)
- `message_body` (string, obrigatório): Conteúdo da mensagem
- `external_id` (string, obrigatório): ID único para rastreamento (deve conter campaign_id e contact_id)

**Resposta (Sucesso - 200 OK):**
```json
{
  "status": "queued",
  "message_id": "msg-f1d945d7-e605-4437-975b-864f7641eeff",
  "provider_details": {
    "mock_id": "mock-1764116955941",
    "provider": "mock",
    "queued_at": "2025-11-26T00:29:15.941Z"
  }
}
```

**Resposta (API Key Inválida - 401 Unauthorized):**
```json
{
  "error": "Invalid API Key"
}
```

**Resposta (API Key Ausente - 401 Unauthorized):**
```json
{
  "error": "Missing X-API-Key header"
}
```

**Resposta (Validação Falhou - 400 Bad Request):**
```json
{
  "error": "Missing required fields: recipient_phone, message_body, external_id"
}
```

ou

```json
{
  "error": "Invalid phone number format"
}
```

**Resposta (Erro Interno - 500 Internal Server Error):**
```json
{
  "error": "Internal server error",
  "details": "Descrição do erro"
}
```

**Exemplo com cURL:**
```bash
curl -X POST http://localhost:3001/v1/messages/send \
  -H "X-API-Key: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_phone": "+5564999998888",
    "message_body": "Olá! Teste de mensagem.",
    "external_id": "campaign_123_contact_456"
  }'
```

---

## 🔄 Fluxo Prático de Funcionamento

### Cenário: Disparar campanha para 100 contatos

#### **Passo 1: Usuário clica em "Iniciar Disparo"**
- Página de campanhas do `reach-town` exibe botão "Disparar"
- Usuário confirma o disparo

#### **Passo 2: reach-town busca os contatos**
```javascript
// No reach-town
const campaign = await supabase
  .from('campaigns')
  .select('*, contacts:contact_ids')
  .eq('id', campaignId)
  .single();

// Resultado: 100 contatos com id, name, phone, tags
```

#### **Passo 3: reach-town itera sobre os contatos**
```javascript
for (const contact of campaign.contacts) {
  // Para cada contato, faz uma chamada ao Dispatcher
  const response = await fetch('http://localhost:3001/v1/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'dev-api-key-12345'
    },
    body: JSON.stringify({
      recipient_phone: contact.phone,
      message_body: "Olá " + contact.name + "! Mensagem da campanha...",
      external_id: `campaign_${campaignId}_contact_${contact.id}`
    })
  });

  const result = await response.json();
  
  // Armazena o message_id no Supabase para rastreamento
  await supabase
    .from('message_logs')
    .insert({
      campaign_id: campaignId,
      contact_id: contact.id,
      message_id: result.message_id,
      status: result.status,
      sent_at: new Date()
    });
}
```

#### **Passo 4: Dispatcher processa cada requisição**

**Para cada POST /v1/messages/send:**

1. ✅ Valida headers (API Key)
2. ✅ Valida body (campos obrigatórios)
3. ✅ Valida formato do telefone
4. ✅ Gera um message_id único (`msg-{uuid}`)
5. ✅ Chama o MockWhatsAppProvider
6. ✅ Retorna response com status `queued`

**Resposta de cada chamada:**
```json
{
  "status": "queued",
  "message_id": "msg-xxxxx",
  "provider_details": {...}
}
```

#### **Passo 5: reach-town rastreia status**
- Armazena cada message_id no Supabase
- Atualiza UI com progresso do disparo
- Exibe: "Enviando 45 de 100 mensagens..."

---

## 🏷️ Estrutura Interna

### **IWhatsAppProvider (Interface)**
```typescript
interface IWhatsAppProvider {
  sendMessage(phone: string, message: string, externalId: string): Promise<WhatsAppProviderResponse>;
}
```

Qualquer provedor de WhatsApp deve implementar essa interface.

### **MockWhatsAppProvider (Implementação Atual)**
```typescript
class MockWhatsAppProvider implements IWhatsAppProvider {
  async sendMessage(phone: string, message: string, externalId: string): Promise<WhatsAppProviderResponse> {
    // Apenas loga a mensagem no console (desenvolvimento)
    console.log(`[MOCK] Enviando para ${phone}: "${message}"`);
    
    // Simula delay
    await new Promise(r => setTimeout(r, 100));
    
    // Retorna sucesso
    return {
      success: true,
      details: {
        mock_id: `mock-${Date.now()}`,
        provider: 'mock',
        queued_at: new Date().toISOString(),
      },
    };
  }
}
```

**Objetivo:** Permitir testes sem enviar mensagens reais.

### **Validações Implementadas**

1. **API Key:**
   - Header `X-API-Key` obrigatório
   - Deve corresponder a `process.env.API_KEY`

2. **Telefone:**
   - Deve ter 10-15 dígitos (removidos símbolos)
   - Formato: `+5564999998888` ou `5564999998888`

3. **Campos Obrigatórios:**
   - `recipient_phone`
   - `message_body`
   - `external_id`

4. **Mensagem:**
   - String não vazia

---

## ⚙️ Configuração

### **.env**
```env
PORT=3001                          # Porta do servidor
API_KEY=dev-api-key-12345          # Chave de API para autenticação
WHATSAPP_PROVIDER=mock             # Provider: mock, twilio, evolution, etc
```

### **Variáveis de Ambiente**
- `PORT`: Porta na qual o Dispatcher vai rodar (padrão: 3001)
- `API_KEY`: Chave secreta para autenticação (deve ser segura em produção)
- `WHATSAPP_PROVIDER`: Qual provider usar (mock durante desenvolvimento)

---

## 🔐 Segurança

### Autenticação
- ✅ API Key via header `X-API-Key`
- ✅ Validação em middleware
- ✅ Rejeita requisições sem a chave correta

### Validações
- ✅ Input validation (campos, formato)
- ✅ Sanitização básica
- ✅ Tratamento de erros

### O que NÃO está implementado ainda
- ❌ Rate limiting (limitar X requisições por minuto)
- ❌ HTTPS (usar em produção)
- ❌ Logging de requisições
- ❌ Retries automáticos
- ❌ Webhooks para status updates

---

## 📊 Tipos de Resposta

### Sucesso (200)
```json
{
  "status": "queued",
  "message_id": "msg-...",
  "provider_details": {...}
}
```

### Erro de Autenticação (401)
```json
{
  "error": "Invalid API Key"
}
```

### Erro de Validação (400)
```json
{
  "error": "Invalid phone number format"
}
```

### Erro Interno (500)
```json
{
  "error": "Internal server error",
  "details": "..."
}
```

---

## 🚀 Próximos Passos

### Fase 1: Integração (Próxima)
- [ ] Criar `dispatcherService.ts` no reach-town
- [ ] Adicionar botão "Iniciar Disparo" em campanhas
- [ ] Criar UI para rastreamento de envios

### Fase 2: Provedor Real
- [ ] Implementar TwilioProvider
- [ ] Implementar EvolutionProvider
- [ ] Implementar BaileysProvider
- [ ] Permitir seleção de provedor

### Fase 3: Rastreamento Avançado
- [ ] Criar tabela `message_logs` no Supabase
- [ ] Implementar webhooks para status updates
- [ ] Adicionar retry automático
- [ ] Dashboard de estatísticas

### Fase 4: Produção
- [ ] Rate limiting
- [ ] Logging estruturado
- [ ] Monitoramento e alertas
- [ ] Deploy em produção (Docker/Kubernetes)

---

## 📝 Exemplos de Uso

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:3001/v1/messages/send', {
  method: 'POST',
  headers: {
    'X-API-Key': 'dev-api-key-12345',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient_phone: '+5564999998888',
    message_body: 'Olá! Teste',
    external_id: 'campaign_1_contact_1'
  })
});

const data = await response.json();
console.log(data);
```

### cURL
```bash
curl -X POST http://localhost:3001/v1/messages/send \
  -H "X-API-Key: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_phone": "+5564999998888",
    "message_body": "Olá! Teste",
    "external_id": "campaign_1_contact_1"
  }'
```

### Postman
1. Criar requisição POST
2. URL: `http://localhost:3001/v1/messages/send`
3. Headers: `X-API-Key: dev-api-key-12345`
4. Body (JSON raw):
```json
{
  "recipient_phone": "+5564999998888",
  "message_body": "Olá! Teste",
  "external_id": "campaign_1_contact_1"
}
```

---

## ✅ Status Atual

- ✅ Estrutura básica criada
- ✅ Endpoints implementados
- ✅ Autenticação funcionando
- ✅ Validações básicas
- ✅ MockProvider funcionando
- ✅ Testes passando
- ⏳ Integração com reach-town (próxima)

