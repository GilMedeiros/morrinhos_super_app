-- Script para modificar a foreign key constraint para CASCADE
-- Isso fará com que ao deletar um source, todos os extraction_results relacionados sejam deletados automaticamente
BEGIN;
-- 1. Remover a constraint atual
ALTER TABLE extraction_results DROP CONSTRAINT contribuintes_source_id_fkey;
-- 2. Adicionar a constraint com CASCADE
ALTER TABLE extraction_results
ADD CONSTRAINT contribuintes_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE;
COMMIT;