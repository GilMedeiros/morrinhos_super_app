-- Inserir conversas de exemplo
INSERT INTO public.whatsapp_conversations (phone_number, contact_name, last_message, last_message_at, unread_count, status, secretaria_id)
VALUES 
  ('5562999887766', 'Maria Silva', 'Gostaria de informações sobre IPTU', NOW() - INTERVAL '2 hours', 2, 'aberto', (SELECT id FROM public.secretarias LIMIT 1)),
  ('5562988776655', 'João Santos', 'Obrigado pelo atendimento!', NOW() - INTERVAL '5 hours', 0, 'fechado', (SELECT id FROM public.secretarias LIMIT 1)),
  ('5562977665544', 'Ana Costa', 'Preciso de ajuda com alvará', NOW() - INTERVAL '1 day', 1, 'aberto', (SELECT id FROM public.secretarias LIMIT 1)),
  ('5562966554433', 'Carlos Oliveira', 'Bom dia! Tem alguém disponível?', NOW() - INTERVAL '3 days', 3, 'em_atendimento', (SELECT id FROM public.secretarias LIMIT 1));

-- Inserir mensagens para a primeira conversa (Maria Silva)
INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at)
SELECT 
  id,
  'Olá, bom dia!',
  true,
  NULL,
  NOW() - INTERVAL '2 hours 10 minutes'
FROM public.whatsapp_conversations WHERE phone_number = '5562999887766';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at)
SELECT 
  id,
  'Gostaria de informações sobre IPTU',
  true,
  NULL,
  NOW() - INTERVAL '2 hours'
FROM public.whatsapp_conversations WHERE phone_number = '5562999887766';

-- Inserir mensagens para a segunda conversa (João Santos)
INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at, read_at)
SELECT 
  id,
  'Olá! Preciso de ajuda com um documento',
  true,
  NULL,
  NOW() - INTERVAL '5 hours 30 minutes',
  NOW() - INTERVAL '5 hours 25 minutes'
FROM public.whatsapp_conversations WHERE phone_number = '5562988776655';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at, read_at)
SELECT 
  wc.id,
  'Claro! Como posso ajudar?',
  false,
  (SELECT user_id FROM public.user_roles LIMIT 1),
  NOW() - INTERVAL '5 hours 20 minutes',
  NOW() - INTERVAL '5 hours 15 minutes'
FROM public.whatsapp_conversations wc WHERE wc.phone_number = '5562988776655';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at, read_at)
SELECT 
  id,
  'Já consegui resolver, obrigado!',
  true,
  NULL,
  NOW() - INTERVAL '5 hours 10 minutes',
  NOW() - INTERVAL '5 hours 5 minutes'
FROM public.whatsapp_conversations WHERE phone_number = '5562988776655';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at, read_at)
SELECT 
  wc.id,
  'Que bom! Fico à disposição.',
  false,
  (SELECT user_id FROM public.user_roles LIMIT 1),
  NOW() - INTERVAL '5 hours 5 minutes',
  NOW() - INTERVAL '5 hours'
FROM public.whatsapp_conversations wc WHERE wc.phone_number = '5562988776655';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at, read_at)
SELECT 
  id,
  'Obrigado pelo atendimento!',
  true,
  NULL,
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '4 hours 55 minutes'
FROM public.whatsapp_conversations WHERE phone_number = '5562988776655';

-- Inserir mensagens para a terceira conversa (Ana Costa)
INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at)
SELECT 
  id,
  'Boa tarde!',
  true,
  NULL,
  NOW() - INTERVAL '1 day 2 hours'
FROM public.whatsapp_conversations WHERE phone_number = '5562977665544';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at)
SELECT 
  id,
  'Preciso de ajuda com alvará',
  true,
  NULL,
  NOW() - INTERVAL '1 day'
FROM public.whatsapp_conversations WHERE phone_number = '5562977665544';

-- Inserir mensagens para a quarta conversa (Carlos Oliveira)
INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at)
SELECT 
  id,
  'Bom dia!',
  true,
  NULL,
  NOW() - INTERVAL '3 days 5 hours'
FROM public.whatsapp_conversations WHERE phone_number = '5562966554433';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at)
SELECT 
  id,
  'Tem alguém disponível?',
  true,
  NULL,
  NOW() - INTERVAL '3 days 4 hours'
FROM public.whatsapp_conversations WHERE phone_number = '5562966554433';

INSERT INTO public.whatsapp_messages (conversation_id, content, is_from_customer, sent_by, created_at)
SELECT 
  id,
  'Preciso resolver uma questão urgente',
  true,
  NULL,
  NOW() - INTERVAL '3 days'
FROM public.whatsapp_conversations WHERE phone_number = '5562966554433';