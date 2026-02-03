# Quick Start: Sistema de Logs 🚀

## 1. Aplicar a Migration do Supabase

```bash
# No terminal da pasta reach-town
supabase migration up
```

ou se estiver usando o Supabase CLI:

```bash
supabase db push
```

## 2. Testar o Sistema

### Opção A: Executar fluxo completo de campanha

1. Abra reach-town no navegador
2. Vá para **Campanhas** → Crie uma campanha (se não tiver)
3. Adicione 3-5 contatos
4. Clique no botão **Play** para disparar
5. Vá para **Logs** e veja os eventos registrados

### Opção B: Testar diretamente via Console

```typescript
import { loggerService } from '@/services/loggerService';

// Teste simples
await loggerService.info('TEST', 'Testing logger', { test: true });

// Buscar logs
const logs = await loggerService.getLogs('TEST', 'info', 10);
console.log(logs);
```

## 3. Acessar a Página de Logs

- URL: `http://localhost:5173/logs`
- Menu: Sidebar → Logs (ícone de arquivo)
- Acesso: Apenas admin_geral

## 4. Ver Erro de "1 Falha"

1. Vá para `/logs`
2. **Filtro Módulo**: `DISPATCHER_SERVICE`
3. **Filtro Nível**: `error`
4. **Clique em "Ver detalhes"** para ver a causa

## Estrutura Criada

```
src/
├── services/
│   ├── dispatcherService.ts (modificado ✓)
│   └── loggerService.ts (novo ✓)
├── hooks/
│   └── useCampaignDispatch.tsx (modificado ✓)
├── pages/
│   └── Logs.tsx (novo ✓)
├── components/
│   └── AppSidebar.tsx (modificado ✓)
├── App.tsx (modificado ✓)
└── LOGGING_SYSTEM.md (novo ✓)

supabase/
└── migrations/
    └── 20251126_create_logs_table.sql (novo ✓)
```

## Logs Gerados Automaticamente

### Quando você dispara uma campanha:

```
✓ CAMPAIGN_DISPATCH - info - Starting dispatch for campaign XYZ
✓ CAMPAIGN_DISPATCH - info - Campaign found: Minha Campanha
✓ CAMPAIGN_DISPATCH - info - Fetched 5 contacts
✓ DISPATCHER_SERVICE - success - Message sent to +55112999999
✓ DISPATCHER_SERVICE - error - Send failed for +55115555555
✓ CAMPAIGN_DISPATCH - success - Stored 5 message logs
✓ CAMPAIGN_DISPATCH - success - Campaign dispatch completed
```

## Exemplo de Uso Customizado

Se precisar registrar eventos em outros lugares:

```typescript
import { loggerService } from '@/services/loggerService';

// Em um componente
async function handleSomething() {
    try {
        // seu código
        await loggerService.success('MY_MODULE', 'Something completed', {
            itemId: '123',
            duration: '2.5s'
        });
    } catch (err) {
        await loggerService.error('MY_MODULE', 'Something failed', {
            error: err.message,
            itemId: '123'
        });
    }
}
```

## Verificar se Funciona

### 1. Console (Dev)
Você verá logs assim:
```
[2025-11-26T10:30:45.000Z] [CAMPAIGN_DISPATCH] [INFO] Starting dispatch for campaign...
[2025-11-26T10:30:45.500Z] [DISPATCHER_SERVICE] [SUCCESS] Message sent to...
```

### 2. Supabase
- Acesse Dashboard do Supabase
- Table Editor → `logs`
- Veja os registros sendo inseridos

### 3. Página de Logs
- `/logs` deve mostrar eventos em tempo real
- Filtros funcionando
- Detalhes expandíveis com JSON

## Troubleshooting

### "Erro: Table 'logs' não existe"
```bash
# Confirme se a migration foi aplicada
supabase migration list

# Se não apareceu, execute manualmente:
supabase db push
```

### "Logs não aparecem em /logs"
1. Faça F5 para recarregar a página
2. Verifique se está logado como admin_geral
3. Verifique console do navegador (F12) para erros

### "Dispatcher Service sem logs"
1. Certifique-se que o dispatcher está rodando na porta 3001
2. Verifique o console do dispatcher em outro terminal

## Comandos Úteis

```bash
# Terminal 1: Dispatcher Service
cd dispatcher-service && npm run dev

# Terminal 2: Reach-town
npm run dev

# Terminal 3: Ver logs em tempo real do Supabase
supabase functions tail logs
```

## Próxima Etapa

Depois que confirmar que os logs estão funcionando:
- [ ] Implementar Twilio provider
- [ ] Adicionar webhooks para receber mensagens
- [ ] Implementar estatísticas de campanha

---

💡 **Dica**: Sempre que tiver dúvida sobre o que deu errado, vá para `/logs` e procure por erro!
