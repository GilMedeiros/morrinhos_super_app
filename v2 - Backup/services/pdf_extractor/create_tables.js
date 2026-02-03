const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
    connectionString: 'postgresql://postgres:21F5F7196AADADADA444DADRFSVVXB35A858629D65D752C8@193.203.174.146:5432/morrinhos_arrecadacao?sslmode=disable'
});

async function createTables() {
    const client = await pool.connect();

    try {
        console.log('🔄 Conectando ao banco morrinhos_arrecadacao...');

        // Ler o arquivo SQL
        const sqlPath = path.join(__dirname, 'create_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📝 Executando script de criação de tabelas...');
        await client.query(sql);

        console.log('✅ Tabelas criadas com sucesso!');

        // Verificar se as tabelas foram criadas
        console.log('\n🔍 Verificando tabelas criadas:');

        const checkSources = await client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'sources'");
        console.log(`📊 Tabela sources: ${checkSources.rows[0].count > 0 ? 'EXISTE' : 'NÃO EXISTE'}`);

        const checkExtractionResults = await client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'extraction_results'");
        console.log(`📊 Tabela extraction_results: ${checkExtractionResults.rows[0].count > 0 ? 'EXISTE' : 'NÃO EXISTE'}`);

    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar
createTables();
