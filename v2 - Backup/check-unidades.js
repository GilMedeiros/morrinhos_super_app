const { Pool } = require('pg');
const db = require('./config/database');

async function checkUnidades() {
    const client = await db.pool.connect();

    try {
        console.log('🔍 Verificando estado da coluna unidade...\n');

        // Verificar total de registros
        const totalResult = await client.query('SELECT COUNT(*) as total FROM solicitacoes');
        console.log(`📊 Total de solicitações: ${totalResult.rows[0].total}`);

        // Verificar registros com unidade NULL
        const nullResult = await client.query('SELECT COUNT(*) as count FROM solicitacoes WHERE unidade IS NULL');
        console.log(`❌ Registros com unidade NULL: ${nullResult.rows[0].count}`);

        // Verificar registros com unidade vazia
        const emptyResult = await client.query("SELECT COUNT(*) as count FROM solicitacoes WHERE unidade = ''");
        console.log(`⚠️ Registros com unidade vazia: ${emptyResult.rows[0].count}`);

        // Verificar registros com unidade 'Não informada'
        const notInformedResult = await client.query("SELECT COUNT(*) as count FROM solicitacoes WHERE unidade = 'Não informada'");
        console.log(`ℹ️ Registros com 'Não informada': ${notInformedResult.rows[0].count}`);

        // Verificar registros com unidade válida
        const validResult = await client.query("SELECT COUNT(*) as count FROM solicitacoes WHERE unidade IS NOT NULL AND unidade != '' AND unidade != 'Não informada'");
        console.log(`✅ Registros com unidade válida: ${validResult.rows[0].count}`);

        // Mostrar algumas unidades válidas
        console.log('\n📋 Exemplos de unidades válidas:');
        const examplesResult = await client.query(`
            SELECT DISTINCT unidade, COUNT(*) as count 
            FROM solicitacoes 
            WHERE unidade IS NOT NULL AND unidade != '' AND unidade != 'Não informada'
            GROUP BY unidade 
            ORDER BY count DESC 
            LIMIT 10
        `);

        examplesResult.rows.forEach(row => {
            console.log(`   "${row.unidade}" (${row.count} registros)`);
        });

        // Verificar se a coluna existe
        const columnResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'solicitacoes' AND column_name = 'unidade'
        `);

        if (columnResult.rows.length > 0) {
            console.log('\n🏗️ Estrutura da coluna unidade:');
            console.log(`   Tipo: ${columnResult.rows[0].data_type}`);
            console.log(`   Permite NULL: ${columnResult.rows[0].is_nullable}`);
            console.log(`   Valor padrão: ${columnResult.rows[0].column_default || 'Nenhum'}`);
        } else {
            console.log('\n❌ Coluna unidade não encontrada!');
        }

    } catch (error) {
        console.error('Erro ao verificar unidades:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkUnidades();
