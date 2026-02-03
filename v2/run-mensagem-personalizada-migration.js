const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration() {
    const client = await db.pool.connect();
    try {
        console.log('🚀 Iniciando migração para mensagem personalizada...');

        // Ler o arquivo SQL
        const sqlPath = path.join(__dirname, 'database', 'migrations', 'add_mensagem_personalizada.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Executar a migração
        await client.query(sql);

        console.log('✅ Migração concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Executar a migração
runMigration().catch(console.error);