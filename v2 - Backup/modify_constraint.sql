-- Script SQL para modificar constraint para CASCADE
-- Executar no PostgreSQL
-- Verificar constraint atual
SELECT constraint_name,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'extraction_results'
    AND constraint_name = 'contribuintes_source_id_fkey';
-- Modificar constraint
BEGIN;
-- Remover constraint atual
ALTER TABLE extraction_results DROP CONSTRAINT IF EXISTS contribuintes_source_id_fkey;
-- Adicionar constraint com CASCADE
ALTER TABLE extraction_results
ADD CONSTRAINT contribuintes_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE;
COMMIT;
-- Verificar se foi aplicado
SELECT constraint_name,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'extraction_results'
    AND constraint_name = 'contribuintes_source_id_fkey';