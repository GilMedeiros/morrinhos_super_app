-- SQL para modificar a foreign key constraint para permitir CASCADE
-- Execute este SQL no seu banco PostgreSQL
BEGIN;
-- 1. Remover a constraint atual
ALTER TABLE extraction_results DROP CONSTRAINT contribuintes_source_id_fkey;
-- 2. Adicionar a constraint com CASCADE
ALTER TABLE extraction_results
ADD CONSTRAINT contribuintes_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE;
COMMIT;
-- Verificar se a constraint foi criada corretamente
SELECT conname as constraint_name,
    confdeltype as delete_action
FROM pg_constraint
WHERE conname = 'contribuintes_source_id_fkey';
-- delete_action: 'c' = CASCADE, 'r' = RESTRICT