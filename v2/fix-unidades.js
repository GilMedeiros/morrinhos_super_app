const db = require('./config/database');

async function fixUnidades() {
    const client = await db.pool.connect();

    try {
        console.log('🔧 Corrigindo registros com unidade NULL...\n');

        // Verificar quantos registros precisam ser corrigidos
        const nullCountResult = await client.query('SELECT COUNT(*) as count FROM solicitacoes WHERE unidade IS NULL');
        const nullCount = nullCountResult.rows[0].count;

        console.log(`📊 Registros com unidade NULL: ${nullCount}`);

        if (nullCount > 0) {
            // Atualizar registros NULL para uma unidade padrão
            const updateResult = await client.query(`
                UPDATE solicitacoes 
                SET unidade = 'Unidade não especificada' 
                WHERE unidade IS NULL
            `);

            console.log(`✅ Atualizados ${updateResult.rowCount} registros`);

            // Verificar resultado
            const newNullCountResult = await client.query('SELECT COUNT(*) as count FROM solicitacoes WHERE unidade IS NULL');
            const newNullCount = newNullCountResult.rows[0].count;

            console.log(`📊 Registros com unidade NULL após correção: ${newNullCount}`);

            // Mostrar distribuição atualizada
            console.log('\n📋 Distribuição de unidades após correção:');
            const distributionResult = await client.query(`
                SELECT unidade, COUNT(*) as count 
                FROM solicitacoes 
                GROUP BY unidade 
                ORDER BY count DESC
            `);

            distributionResult.rows.forEach(row => {
                console.log(`   "${row.unidade}": ${row.count} registros`);
            });

        } else {
            console.log('✅ Não há registros para corrigir!');
        }

    } catch (error) {
        console.error('❌ Erro ao corrigir unidades:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixUnidades();
