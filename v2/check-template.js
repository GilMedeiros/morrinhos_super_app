const db = require('./config/database');

async function checkTemplate() {
    const client = await db.pool.connect();

    try {
        console.log('🔍 Verificando template atual...\n');

        // Buscar configuração atual do webhook
        const configResult = await client.query(`
            SELECT * FROM webhook_config 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (configResult.rows.length > 0) {
            const config = configResult.rows[0];
            console.log('📋 Configuração encontrada:');
            console.log('URL:', config.url);
            console.log('Método:', config.http_method);
            console.log('Template do Payload:');
            console.log(config.payload_template || 'Nenhum template configurado');

            // Verificar se o template inclui unidade
            if (config.payload_template) {
                const hasUnidade = config.payload_template.includes('{unidade}');
                console.log(`\n🔍 Template inclui {unidade}: ${hasUnidade ? '✅ SIM' : '❌ NÃO'}`);

                if (!hasUnidade) {
                    console.log('\n⚠️ PROBLEMA IDENTIFICADO: Template não inclui a variável {unidade}');
                    console.log('💡 Solução: Atualizar o template para incluir "unidade": "{unidade}"');
                }
            } else {
                console.log('\n✅ Nenhum template customizado - usando template padrão que inclui unidade');
            }
        } else {
            console.log('❌ Nenhuma configuração de webhook encontrada');
        }

    } catch (error) {
        console.error('❌ Erro ao verificar template:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkTemplate();
