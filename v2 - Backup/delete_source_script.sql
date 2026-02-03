-- Script para deletar um source e seus registros relacionados
-- Substitua {SOURCE_ID} pelo ID do source que você quer deletar
BEGIN;
-- 1. Deletar todos os registros de extraction_results relacionados
DELETE FROM extraction_results
WHERE source_id = { SOURCE_ID };
-- 2. Deletar o source
DELETE FROM sources
WHERE id = { SOURCE_ID };
COMMIT;
-- Para verificar quantos registros serão deletados antes de executar:
-- SELECT COUNT(*) FROM extraction_results WHERE source_id = {SOURCE_ID};
-- SELECT * FROM sources WHERE id = {SOURCE_ID};