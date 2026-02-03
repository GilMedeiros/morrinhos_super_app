# 📝 EXEMPLOS DE LOGS REAIS

## Cenário 1: Disparo Bem-Sucedido (3 contatos)

```
Timestamp          │ Módulo              │ Nível   │ Mensagem                      │ Detalhes
───────────────────┼─────────────────────┼─────────┼───────────────────────────────┼─────────
26/11/2025 10:30:45│ CAMPAIGN_DISPATCH   │ INFO    │ Starting dispatch for...      │ campId...
26/11/2025 10:30:46│ CAMPAIGN_DISPATCH   │ INFO    │ Campaign found: Saúde 2025    │ name...
26/11/2025 10:30:47│ CAMPAIGN_DISPATCH   │ INFO    │ Fetched 3 contacts            │ {count:3}
26/11/2025 10:30:48│ DISPATCHER_SERVICE  │ SUCCESS │ Message sent to +55112999...  │ msgId...
26/11/2025 10:30:49│ DISPATCHER_SERVICE  │ SUCCESS │ Message sent to +55118888...  │ msgId...
26/11/2025 10:30:50│ DISPATCHER_SERVICE  │ SUCCESS │ Message sent to +55113333...  │ msgId...
26/11/2025 10:30:51│ CAMPAIGN_DISPATCH   │ SUCCESS │ Stored 3 message logs         │ {count:3}
26/11/2025 10:30:52│ CAMPAIGN_DISPATCH   │ SUCCESS │ Campaign dispatch completed   │ {sent:3, f:0}
```

**Resultado na UI**: ✅ 3 enviados, 0 falharam

---

## Cenário 2: Disparo com 1 Falha (3 contatos)

```
Timestamp          │ Módulo              │ Nível   │ Mensagem
───────────────────┼─────────────────────┼─────────┼──────────────────────────────
26/11/2025 10:31:00│ CAMPAIGN_DISPATCH   │ INFO    │ Starting dispatch for camp...
26/11/2025 10:31:01│ CAMPAIGN_DISPATCH   │ INFO    │ Campaign found: Saúde 2025
26/11/2025 10:31:02│ CAMPAIGN_DISPATCH   │ INFO    │ Fetched 3 contacts
26/11/2025 10:31:03│ DISPATCHER_SERVICE  │ SUCCESS │ Message sent to +55112999...
26/11/2025 10:31:04│ DISPATCHER_SERVICE  │ ERROR   │ Send failed for +5511XXXX...  ← O CULPADO!
26/11/2025 10:31:05│ DISPATCHER_SERVICE  │ SUCCESS │ Message sent to +55113333...
26/11/2025 10:31:06│ CAMPAIGN_DISPATCH   │ SUCCESS │ Stored 3 message logs
26/11/2025 10:31:07│ CAMPAIGN_DISPATCH   │ SUCCESS │ Campaign dispatch completed   │ {sent:2, f:1}
```

**Ao clicar em "Ver detalhes" na falha:**
```json
{
  "externalId": "campaign_abc123_contact_def456",
  "status": 400,
  "error": "Invalid phone number format",
  "details": {
    "phone": "+55119999999",
    "reason": "Expected 11 digits after country code"
  }
}
```

**Resultado na UI**: ⚠️ 2 enviados, 1 falhou (visto exatamente qual)

---

## Cenário 3: Falha Geral (Dispatcher Offline)

```
Timestamp          │ Módulo              │ Nível   │ Mensagem
───────────────────┼─────────────────────┼─────────┼──────────────────────────────
26/11/2025 10:32:00│ CAMPAIGN_DISPATCH   │ INFO    │ Starting dispatch for camp...
26/11/2025 10:32:01│ CAMPAIGN_DISPATCH   │ INFO    │ Campaign found: Saúde 2025
26/11/2025 10:32:02│ CAMPAIGN_DISPATCH   │ INFO    │ Fetched 3 contacts
26/11/2025 10:32:03│ DISPATCHER_SERVICE  │ ERROR   │ Send failed for +55112999...
26/11/2025 10:32:03│ DISPATCHER_SERVICE  │ ERROR   │ Send failed for +55118888...
26/11/2025 10:32:03│ DISPATCHER_SERVICE  │ ERROR   │ Send failed for +55113333...
26/11/2025 10:32:04│ CAMPAIGN_DISPATCH   │ SUCCESS │ Stored 3 message logs
26/11/2025 10:32:05│ CAMPAIGN_DISPATCH   │ SUCCESS │ Campaign dispatch completed   │ {sent:0, f:3}
```

**Detalhes dos erros:**
```json
{
  "externalId": "campaign_abc123_contact_xyz789",
  "error": "Failed to connect to Dispatcher Service",
  "details": {
    "url": "http://localhost:3001/v1/messages/send",
    "reason": "ECONNREFUSED - Connection refused"
  }
}
```

**Ação**: Iniciar Dispatcher Service em outro terminal

---

## Cenário 4: Erro de Supabase (Contatos não carregam)

```
Timestamp          │ Módulo              │ Nível   │ Mensagem
───────────────────┼─────────────────────┼─────────┼──────────────────────────────
26/11/2025 10:33:00│ CAMPAIGN_DISPATCH   │ INFO    │ Starting dispatch for camp...
26/11/2025 10:33:01│ CAMPAIGN_DISPATCH   │ INFO    │ Campaign found: Saúde 2025
26/11/2025 10:33:02│ CAMPAIGN_DISPATCH   │ ERROR   │ Failed to fetch contacts    ← ERRO!
```

**Detalhes do erro:**
```json
{
  "campaignId": "abc123",
  "contactsErr": {
    "message": "relation 'contacts' does not exist",
    "code": "42P01"
  }
}
```

**Ação**: Executar `supabase migration up` para criar tabelas

---

## Cenário 5: Análise Após 100 Campanhas

**Página de Logs com dados reais:**

```
Filtros:
[Módulo: TODOS ▼] [Nível: TODOS ▼] [Atualizar]

Últimos 100 eventos:

26/11 13:45 │ CAMPAIGN_DISPATCH │ SUCCESS │ Campaign dispatch completed
26/11 13:44 │ CAMPAIGN_DISPATCH │ SUCCESS │ Campaign dispatch completed
26/11 13:43 │ DISPATCHER_SERVICE│ ERROR   │ Send failed for +5511XXXX   ← Ver detalhes
26/11 13:42 │ CAMPAIGN_DISPATCH │ SUCCESS │ Campaign dispatch completed
26/11 13:41 │ CAMPAIGN_DISPATCH │ SUCCESS │ Campaign dispatch completed
... (95 mais)

Resumo:
┌──────────────────────────────────────────┐
│ Erros: 2  │ Avisos: 5 │ Sucessos: 93     │
└──────────────────────────────────────────┘
```

---

## Estrutura Completa do JSON de Log

```typescript
// Um log completo armazenado no Supabase

{
  id: "550e8400-e29b-41d4-a716-446655440000",
  level: "error",
  module: "DISPATCHER_SERVICE",
  message: "Send failed for +5511999999999",
  details: {
    "externalId": "campaign_abc123_contact_def456",
    "status": 400,
    "error": "Invalid phone number format",
    "phone": "+5511999999999",
    "campaignId": "abc123",
    "contactId": "def456"
  },
  created_at: "2025-11-26T10:34:15.123Z",
  user_id: "user_123" // Pode ser nulo
}
```

---

## Filtros Exemplo

### Encontrar "Só Erros da Última Hora"
1. Filtro Nível: `error`
2. Vê todos os erros recentes
3. Examina cada um

### Encontrar "Problemas em Dispatcher"
1. Filtro Módulo: `DISPATCHER_SERVICE`
2. Filtro Nível: `error` ou `warning`
3. Lista todos os problemas do Dispatcher

### Encontrar "Campanhas que Completaram"
1. Filtro Módulo: `CAMPAIGN_DISPATCH`
2. Filtro Nível: `success`
3. Vê lista de campanhas bem-sucedidas

### Encontrar "Tudo que Falhou Hoje"
1. Vá para `/logs`
2. Filtro Nível: `error`
3. Procure por logs recentes (data hoje)

---

## Interpretando Mensagens de Erro

| Erro | Significado | Solução |
|------|-------------|---------|
| `Invalid phone number format` | Formato de telefone incorreto | Corrigir contato |
| `ECONNREFUSED` | Dispatcher offline | Iniciar dispatcher |
| `relation 'contacts' does not exist` | Migration não rodou | Executar `supabase migration up` |
| `Invalid phone number` | Twilio rejeitou | Verificar com Twilio |
| `Failed to store message logs` | Erro Supabase | Verificar conexão BD |

---

## Dashboard de Logs em Tempo Real

```
Página: /logs
Atualiza a cada: Click manual ou page refresh
Limite: 200 eventos por query

┌─────────────────────────────────────────────────────────┐
│ FILTROS                                                 │
├─────────────────────────────────────────────────────────┤
│ Módulo: [Todos ▼]  Nível: [Todos ▼]  [🔄 Atualizar]   │
├─────────────────────────────────────────────────────────┤
│ TABELA DE LOGS                                          │
├─────────────────────────────────────────────────────────┤
│ Hora | Módulo | Nível | Mensagem | Detalhes            │
├─────────────────────────────────────────────────────────┤
│ 13:45│ CAMP.. │ SUCC │ Dispatch ..│ [Ver detalhes ►]   │
│ 13:44│ DISP..│ ERROR│ Send failed│ [Ver detalhes ►]   │
│ 13:43│ CAMP.. │ INFO │ Fetched 5 │                     │
├─────────────────────────────────────────────────────────┤
│ RESUMO                                                  │
├─────────────────────────────────────────────────────────┤
│ [Erros: 2]  [Avisos: 3]  [Sucessos: 195]  [Outros: 5]  │
└─────────────────────────────────────────────────────────┘

Detalhes Expandido (click em "Ver detalhes"):

{
  "externalId": "campaign_xyz_contact_abc",
  "status": 400,
  "error": "Invalid phone number",
  "timestamp": "2025-11-26T13:44:15Z"
}
```

---

## Real-World: Rastreando 1 Falha

**Passo 1: Disparar campanha**
```
Clica em Play na campanha "Saúde 2025"
Insere mensagem: "Teste de disparo"
Clica: "Disparar para Todos"
```

**Passo 2: Ver resultado**
```
Modal mostra: "Disparo Concluído!"
Estatísticas: 4 enviados, 1 falhou
```

**Passo 3: Investigar falha**
```
Clica Menu → Logs
Filtra: Módulo = DISPATCHER_SERVICE, Nível = error
Vê 1 log de erro
```

**Passo 4: Ver detalhes**
```
Clica em "Ver detalhes" no log de erro
JSON expandido mostra:
{
  "phone": "+55119876543",
  "error": "Invalid phone number format",
  "reason": "Expected 11 digits"
}
```

**Passo 5: Resolver**
```
Vai para Contatos
Edita contato com esse telefone
Corrige para: "+551199876543"
Dispara novamente
```

**Passo 6: Verificar sucesso**
```
Volta para Logs
Novo log aparece com SUCCESS
Contato enviado com sucesso
```

---

**Sistema de Logs em ação! 🎉**
