const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config/db');

async function runMigration() {
    const pool = new Pool(config);
    const client = await pool.connect();

    try {
        console.log('Iniciando migração da tabela csv_data...');

        const sqlPath = path.join(__dirname, 'migrations', 'create_csv_data_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('Migração concluída com sucesso!');

    } catch (error) {
        console.error('Erro durante a migração:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);