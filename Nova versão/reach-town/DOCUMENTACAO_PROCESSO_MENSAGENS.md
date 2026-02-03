# Processo de Envio e Recebimento de Mensagens

Este documento descreve o fluxo completo de envio e recebimento de mensagens na aplicação Reach Town, considerando tanto o lado do atendente (dashboard) quanto o canal WhatsApp via N8N/Supabase.

---

## 🔹 Envio de Mensagens (Atendente → WhatsApp)

1. **Usuário/atendente** digita e envia uma mensagem pelo chat da aplicação.
2. **Frontend**:
   - Salva a mensagem na tabela `whatsapp_messages` do Supabase (campo `is_from_customer = false`).
   - Dispara uma requisição HTTP para o endpoint `/v1/messages/send` do **Dispatcher Service**.
3. **Dispatcher Service**:
   - Recebe o POST, valida e repassa a mensagem ao **provedor N8N** via webhook, junto com os metadados (ID da conversa, telefone, etc).
4. **N8N**:
   - Recebe o webhook, entrega a mensagem pelo provedor WhatsApp contratado.
5. **Supabase**:
   - Todas as mensagens e logs ficam centralizados no Supabase, permitindo rastreabilidade e exibição em tempo real no chat.

## 🔹 Recebimento de Mensagens (WhatsApp → Sistema)

1. **Usuário final** envia mensagem pelo WhatsApp para o número integrado.
2. **Provedor (ex: N8N)** intercepta e dispara um webhook HTTP para o endpoint `/v1/messages/incoming` do **Dispatcher Service**.
3. **Dispatcher Service**:
   - Apenas faz o "forward" (encaminhamento) do payload para uma Supabase Function HTTP (`save-incoming-message`).
   - Inclui autenticação (API key) na chamada.
4. **Supabase Function**:
   - Processa o payload (número, conteúdo, etc).
   - Busca uma conversa existente com base no número (`phone_number`) na tabela `whatsapp_conversations`.
   - Se não encontrar, cria uma nova conversa (vincula automaticamente todas as mensagens subsequentes ao mesmo número).
   - Registra a mensagem recebida em `whatsapp_messages` (campo `is_from_customer = true`).
   - Atualiza os campos de `last_message`, `last_message_at` e `unread_count` na conversa.
5. **Frontend**:
   - Recebe as novas mensagens em tempo real via Supabase Realtime e exibe ao atendente na interface do chat.

## 🔹 Pontos Importantes

- Todo controle de vinculação conversas/mensagens é feito pelo telefone (`phone_number`) como chave natural.
- Não é necessário informar `external_id` sempre—o sistema identifica/cria conversas automaticamente.
- Logs detalhados são mantidos tanto no dispatcher quanto no Supabase Functions para facilitar auditoria.
- O Supabase é a fonte única de verdade para conversas e mensagens.

---

**Fluxo resumido:**

- Atendente envia → Dispatcher → N8N → WhatsApp → Usuário
- Usuário responde → N8N → Dispatcher → Supabase Function → Banco → Interface (Realtime)

---

_Última atualização: 08/12/2025_
