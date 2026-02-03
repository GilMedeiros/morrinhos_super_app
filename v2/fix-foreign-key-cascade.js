#!/usr/bin/env node

const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    host: process.env.DB_HOST || '193.203.174.146',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'morrinhos_arrecadacao',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '21F5F7196AADADADA444DADRFSVVXB35A858629D65D752C8',
    ssl: false
});

async function modificarConstraintCascade() {
    const client = await pool.connect();

    try {
        console.log('🔧 Iniciando modificação da constraint para CASCADE...');

        // Verificar se a constraint existe
        const checkConstraint = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'extraction_results' 
            AND constraint_name = 'contribuintes_source_id_fkey'
        `);

        if (checkConstraint.rows.length === 0) {
            console.log('❌ Constraint contribuintes_source_id_fkey não encontrada');
            return;
        }

        await client.query('BEGIN');

        // Remover constraint atual
        console.log('🗑️  Removendo constraint atual...');
        await client.query(`
            ALTER TABLE extraction_results 
            DROP CONSTRAINT contribuintes_source_id_fkey
        `);

        // Adicionar constraint com CASCADE
        console.log('➕ Adicionando constraint com CASCADE...');
        await client.query(`
            ALTER TABLE extraction_results 
            ADD CONSTRAINT contribuintes_source_id_fkey 
            FOREIGN KEY (source_id) 
            REFERENCES sources(id) 
            ON DELETE CASCADE
        `);

        await client.query('COMMIT');

        console.log('✅ Constraint modificada com sucesso!');
        console.log('🎯 Agora ao deletar um source, todos os extraction_results relacionados serão deletados automaticamente');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao modificar constraint:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    modificarConstraintCascade()
        .then(() => {
            console.log('🎉 Processo concluído!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Falha na execução:', error.message);
            process.exit(1);
        });
}

module.exports = { modificarConstraintCascade };
