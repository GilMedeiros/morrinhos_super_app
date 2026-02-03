const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    // Configuração do banco de dados
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:21F5F7196AADADADA444DADRFSVVXB35A858629D65D752C8@193.203.174.146:5432/morrinhos?sslmode=disable'
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco de dados');

        // Ler o arquivo de migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', 'migration_create_system_settings_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Executar a migration
        await client.query(migrationSQL);
        console.log('✅ Migration executada com sucesso!');

        // Verificar se os dados foram inseridos
        const result = await client.query('SELECT * FROM system_settings ORDER BY setting_key');
        console.log('📋 Configurações criadas:');
        result.rows.forEach(row => {
            console.log(`   - ${row.setting_key}: ${row.setting_value}`);
        });

    } catch (error) {
        console.error('❌ Erro ao executar migration:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Conexão fechada');
    }
}

runMigration();
