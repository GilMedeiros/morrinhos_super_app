# Dispatcher Service

Microserviço responsável por disparar mensagens de WhatsApp para os contatos das campanhas.

## 📋 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      reach-town (UI)                         │
│                   (Sistema Principal)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                   (HTTP + API Key)
                         │
┌────────────────────────▼────────────────────────────────────┐
│          Dispatcher Service (Microserviço)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Express.js Server                                     │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ API Endpoints:                                   │ │ │
│  │  │  - GET  /health                                  │ │ │
│  │  │  - POST /v1/messages/send (com API Key)         │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Provider Abstraction Layer                           │ │
│  │  ├─ MockWhatsAppProvider (desenvolvimento)           │ │
│  │  ├─ TwilioProvider (futura implementação)            │ │
│  │  ├─ EvolutionProvider (futura implementação)         │ │
│  │  └─ BaileysProvider (futura implementação)           │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                   (API HTTP)
                         │
┌────────────────────────▼────────────────────────────────────┐
│              WhatsApp Provider (Externo)                     │
│  (Twilio, Evolution, Baileys, etc)                          │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Instalação

```bash
cd dispatcher-service
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O servidor iniciará em `http://localhost:3001`

### Build

```bash
npm run build
```

### Produção

```bash
npm start
```

## 📝 Configuração

Crie um arquivo `.env` baseado em `.env.example`:

```env
PORT=3001
API_KEY=sua-chave-secreta-aqui
WHATSAPP_PROVIDER=mock
```

## 🔌 Endpoints

### Health Check (Público)

```bash
GET /health
```

Resposta:
```json
{
  "status": "ok",
  "timestamp": "2025-11-25T10:30:45.123Z"
}
```

### Enviar Mensagem (Protegido)

```bash
POST /v1/messages/send
X-API-Key: dev-api-key-12345
Content-Type: application/json

{
  "recipient_phone": "+5564999998888",
  "message_body": "Olá! Esta é uma mensagem de teste.",
  "external_id": "campaign_123_contact_456"
}
```

Resposta (sucesso):
```json
{
  "status": "queued",
  "message_id": "msg-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "provider_details": {
    "mock_id": "mock-1732509045123",
    "provider": "mock",
    "queued_at": "2025-11-25T10:30:45.123Z"
  }
}
```

## 📁 Estrutura de Pastas

```
dispatcher-service/
├── src/
│   ├── index.ts              # Arquivo de entrada
│   ├── app.ts                # Setup da aplicação Express
│   ├── controllers/
│   │   └── MessageController.ts  # Lógica dos endpoints
│   ├── providers/
│   │   ├── IWhatsAppProvider.ts  # Interface/contrato
│   │   └── MockWhatsAppProvider.ts # Implementação mock
│   ├── routes/
│   │   └── messageRoutes.ts  # Definição das rotas
│   ├── middleware/
│   │   └── apiKeyMiddleware.ts # Autenticação
│   └── types/
│       └── index.ts          # Tipos TypeScript
├── .env                      # Variáveis de ambiente (não commitar)
├── .env.example              # Exemplo de .env
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Segurança

- A autenticação é feita via header `X-API-Key`
- A chave é definida em variáveis de ambiente
- Todas as requisições para `/v1/messages/*` exigem autenticação

## 🎯 Próximos Passos

1. ✅ Estrutura básica com Mock Provider
2. 🔄 Integração com `reach-town`
3. 📦 Implementação de um provedor real (Twilio, Evolution, etc)
4. 📊 Database para rastreamento de mensagens
5. 🔔 Webhooks para atualizações de status

## 🤝 Integração com reach-town

O `reach-town` será atualizado para:

1. Adicionar um botão "Iniciar Disparo" em cada campanha
2. Chamará a API `/v1/messages/send` para cada contato
3. Rastreará o status de cada envio

Exemplo de chamada do reach-town:

```typescript
// src/services/dispatcherService.ts
const response = await fetch('http://localhost:3001/v1/messages/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'dev-api-key-12345'
  },
  body: JSON.stringify({
    recipient_phone: '+5564999998888',
    message_body: 'Mensagem da campanha',
    external_id: 'campaign_123_contact_456'
  })
});
```

## 📞 Testes com cURL

```bash
# Health check
curl http://localhost:3001/health

# Enviar mensagem
curl -X POST http://localhost:3001/v1/messages/send \
  -H "X-API-Key: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_phone": "+5564999998888",
    "message_body": "Olá!",
    "external_id": "test_123"
  }'
```

## 📄 Licença

MIT
