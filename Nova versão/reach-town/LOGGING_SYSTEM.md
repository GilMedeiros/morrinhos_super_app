# Sistema de Logs Centralizado

## Visão Geral

Sistema robusto de logging que registra todos os eventos importantes da aplicação (campanhas, erros, sucesso, etc.) tanto no console (desenvolvimento) quanto no Supabase (banco de dados).

## Arquitetura

### 1. **LoggerService** (`src/services/loggerService.ts`)
Serviço centralizado para toda a aplicação

#### Métodos Principais
- `log(level, module, message, details)` - Log genérico
- `info()` - Informação
- `warning()` - Aviso
- `error()` - Erro
- `debug()` - Debug
- `success()` - Sucesso
- `getLogs(module?, level?, limit?)` - Buscar logs do banco
- `logDispatchError()` - Log específico de erro em dispatch
- `logDispatchSuccess()` - Log específico de sucesso em dispatch
- `cleanOldLogs()` - Remove logs com mais de 30 dias

#### Exemplo de Uso
```typescript
import { loggerService } from '@/services/loggerService';

// Log simples
await loggerService.info('MY_MODULE', 'Something happened', { userId: '123' });

// Log de erro
await loggerService.error('MY_MODULE', 'Failed to process', { 
  reason: 'Network timeout',
  retries: 3 
});

// Log específico de dispatch
await loggerService.logDispatchError(campaignId, contactId, 'Invalid phone');
await loggerService.logDispatchSuccess(campaignId, contactId, messageId);

// Buscar logs
const errorLogs = await loggerService.getLogs('DISPATCHER', 'error', 100);
```

### 2. **Integração no Hook useCampaignDispatch**

Todos os eventos do fluxo de disparo são registrados:

```
✓ Início do disparo
✓ Campanha encontrada
✓ Contatos carregados
✓ Mensagens enviadas (sucesso/falha individual)
✓ Armazenamento de logs
✓ Atualização de status
✓ Conclusão com estatísticas
✗ Erros em qualquer etapa
```

**Exemplo de Log de Dispatch:**
```json
{
  "level": "error",
  "module": "CAMPAIGN_DISPATCH",
  "message": "Dispatch failed for contact ABC123 in campaign XYZ",
  "details": {
    "campaignId": "XYZ",
    "contactId": "ABC123",
    "error": "Invalid phone number",
    "status": 400
  },
  "created_at": "2025-11-26T10:30:45Z"
}
```

### 3. **Integração no DispatcherService**

Registra sucesso/falha de cada mensagem enviada:

```
✓ Envio bem-sucedido (message_id retornado)
✗ Erro de envio (com detalhes da falha)
```

### 4. **Banco de Dados (Supabase)**

#### Tabela `logs`
```sql
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) - 'info', 'warning', 'error', 'debug', 'success'
    module VARCHAR(100) - Identificador do módulo
    message TEXT - Mensagem principal
    details JSONB - Dados adicionais em JSON
    created_at TIMESTAMP - Data/hora do log
    user_id UUID - Referência ao usuário (opcional)
);

Índices:
- idx_logs_module
- idx_logs_level
- idx_logs_created_at DESC
- idx_logs_module_level
```

#### Row Level Security
- Usuários autenticados podem inserir logs
- Usuários autenticados podem visualizar logs

### 5. **Página de Logs** (`src/pages/Logs.tsx`)

Interface web para visualizar, filtrar e analisar logs em tempo real.

#### Funcionalidades
- **Filtro por Módulo** - Selecionar módulo específico
- **Filtro por Nível** - Erros, Avisos, Sucessos, Info, Debug
- **Atualizar** - Recarregar logs
- **Tabela** - Lista com:
  - Data/Hora formatada em PT-BR
  - Módulo (badge)
  - Nível com ícone colorido
  - Mensagem
  - Detalhes (expandível com JSON formatado)
- **Resumo** - Cards com contagem por nível

#### Acesso
- URL: `/logs`
- Restrição: Apenas `admin_geral`
- Menu: Sidebar → Logs (ícone FileText)

## Fluxo Completo de Logs em Campanha

### Cenário: Disparar campanha com 5 contatos

```
1. Click no botão Play
   ↓
2. loggerService.info('CAMPAIGN_DISPATCH', 'Starting dispatch for campaign XYZ')
   ↓
3. Campanha encontrada
   loggerService.info('CAMPAIGN_DISPATCH', 'Campaign found: Minha Campanha', { campaignId })
   ↓
4. 5 contatos carregados
   loggerService.info('CAMPAIGN_DISPATCH', 'Fetched 5 contacts', { campaignId, contactCount: 5 })
   ↓
5. Para cada contato:
   a) Envio bem-sucedido
      loggerService.success('DISPATCHER_SERVICE', 'Message sent to +55112999999', { externalId, messageId })
   
   b) Envio falhou
      loggerService.error('DISPATCHER_SERVICE', 'Send failed for +55112999999', { externalId, error: 'Invalid phone' })
   ↓
6. Armazenar logs
   loggerService.success('CAMPAIGN_DISPATCH', 'Stored 5 message logs', { campaignId })
   ↓
7. Conclusão
   loggerService.success('CAMPAIGN_DISPATCH', 'Campaign dispatch completed', { 
     campaignId, 
     sentCount: 4, 
     failedCount: 1,
     totalContacts: 5 
   })
```

## Como Encontrar Problemas

### Problema: "Disparo concluído com 1 falha"

**Passos para debug:**

1. Vá para página de **Logs** (`/logs`)
2. Filtre por:
   - **Módulo**: `DISPATCHER_SERVICE` (para ver o erro específico)
   - **Nível**: `error`
3. Procure por logs recentes com mensagem contendo "Send failed"
4. Clique em **Ver detalhes** para ver:
   - Número de telefone
   - Mensagem de erro específica
   - Status HTTP (se houver)

### Exemplo de Log de Erro
```
Data: 26/11/2025 10:30:45
Módulo: DISPATCHER_SERVICE
Nível: ERROR
Mensagem: Send failed for +5511999999999
Detalhes:
{
  "externalId": "campaign_abc123_contact_def456",
  "status": 400,
  "error": "Invalid phone number format"
}
```

## Módulos de Log

| Módulo | Função |
|--------|--------|
| `CAMPAIGN_DISPATCH` | Fluxo completo de disparo de campanha |
| `DISPATCHER_SERVICE` | Envio individual de mensagens |
| `AUTH` | Autenticação de usuários |
| `SETTINGS` | Configurações do sistema |
| `CONTACTS` | Gerenciamento de contatos |

## Limpeza Automática

A função `cleanOldLogs()` remove logs com mais de 30 dias automaticamente.

**Implementar limpeza agendada:**
```typescript
// Em background job ou cron
import { loggerService } from '@/services/loggerService';

// Executar diariamente
await loggerService.cleanOldLogs();
```

## Boas Práticas

### ✅ Faça
```typescript
// Log detalhado com contexto
await loggerService.error('CAMPAIGN_DISPATCH', 'Failed to fetch campaign', {
  campaignId: id,
  userId: user.id,
  timestamp: new Date().toISOString(),
  error: err.message
});

// Use nível apropriado
if (result.failed > 0) {
  await loggerService.warning('CAMPAIGN_DISPATCH', '1 message failed to send', {
    failed: result.failed,
    total: result.total
  });
}
```

### ❌ Evite
```typescript
// Muito genérico
await loggerService.error('ERROR', 'Something went wrong');

// Sem contexto
await loggerService.info('APP', 'Done');

// Sem estrutura
console.log('Erro:', err); // Use loggerService ao invés de console.log
```

## Performance

- **Índices otimizados** - Buscas por módulo/nível/data são rápidas
- **Limite padrão** - 200 logs por query (ajustável)
- **JSONB** - Busca eficiente em detalhes
- **RLS** - Segurança sem overhead significativo

## Próximas Melhorias

- [ ] Dashboard com gráficos de erros por hora
- [ ] Alertas automáticos para erros críticos
- [ ] Export de logs em CSV
- [ ] Busca full-text em mensagens
- [ ] Estatísticas por módulo/período
