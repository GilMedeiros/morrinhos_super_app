const { Pool } = require('pg');

async function testDatabases() {
    console.log('🔍 Testando conexões com diferentes bancos...');

    // Testar banco atual (morrinhos)
    const poolMorrinhos = new Pool({
        connectionString: 'postgresql://postgres:21F5F7196AADADADA444DADRFSVVXB35A858629D65D752C8@193.203.174.146:5432/morrinhos?sslmode=disable',
        ssl: false
    });

    // Testar banco morrinhos_arrecadacao
    const poolArrecadacao = new Pool({
        connectionString: 'postgresql://postgres:21F5F7196AADADADA444DADRFSVVXB35A858629D65D752C8@193.203.174.146:5432/morrinhos_arrecadacao?sslmode=disable',
        ssl: false
    });

    try {
        console.log('\n📋 Testando banco "morrinhos"...');
        const client1 = await poolMorrinhos.connect();

        // Verificar tabelas no banco morrinhos
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;

        const result1 = await client1.query(tablesQuery);
        console.log('Tabelas encontradas em "morrinhos":');
        result1.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Verificar se existe disparo na tabela disparos
        try {
            const disparosCount = await client1.query('SELECT COUNT(*) FROM disparos');
            console.log(`📊 Total de disparos em "morrinhos": ${disparosCount.rows[0].count}`);
        } catch (e) {
            console.log('❌ Erro ao contar disparos em "morrinhos":', e.message);
        }

        client1.release();

    } catch (error) {
        console.log('❌ Erro ao conectar no banco "morrinhos":', error.message);
    }

    try {
        console.log('\n📋 Testando banco "morrinhos_arrecadacao"...');
        const client2 = await poolArrecadacao.connect();

        const tablesQuery2 = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;

        const result2 = await client2.query(tablesQuery2);
        console.log('Tabelas encontradas em "morrinhos_arrecadacao":');
        result2.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Verificar se existe disparo na tabela disparos
        try {
            const disparosCount = await client2.query('SELECT COUNT(*) FROM disparos');
            console.log(`📊 Total de disparos em "morrinhos_arrecadacao": ${disparosCount.rows[0].count}`);
        } catch (e) {
            console.log('❌ Erro ao contar disparos em "morrinhos_arrecadacao":', e.message);
        }

        client2.release();

    } catch (error) {
        console.log('❌ Erro ao conectar no banco "morrinhos_arrecadacao":', error.message);
    }

    await poolMorrinhos.end();
    await poolArrecadacao.end();
    process.exit(0);
}

testDatabases();
