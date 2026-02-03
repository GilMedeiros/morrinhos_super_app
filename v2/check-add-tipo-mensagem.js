const db = require('./config/database');

async function checkAndAddTipoMensagemColumn() {
    const client = await db.pool.connect();

    try {
        console.log('🔍 Verificando se a coluna tipo_mensagem existe na tabela queue...');

        // Verificar se a coluna já existe
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'queue' 
            AND column_name = 'tipo_mensagem';
        `;

        const result = await client.query(checkQuery);

        if (result.rows.length === 0) {
            console.log('❌ Coluna tipo_mensagem não encontrada. Adicionando...');

            // Adicionar a coluna
            const addColumnQuery = `
                ALTER TABLE queue 
                ADD COLUMN tipo_mensagem VARCHAR(20) DEFAULT NULL;
            `;

            await client.query(addColumnQuery);

            console.log('✅ Coluna tipo_mensagem adicionada com sucesso!');

            // Adicionar comentário para documentação
            const commentQuery = `
                COMMENT ON COLUMN queue.tipo_mensagem IS 'Tipo da mensagem: informativo ou cobranca';
            `;

            await client.query(commentQuery);
            console.log('📝 Comentário adicionado à coluna');

        } else {
            console.log('✅ Coluna tipo_mensagem já existe na tabela queue');
        }

    } catch (error) {
        console.error('❌ Erro ao verificar/adicionar coluna tipo_mensagem:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkAndAddTipoMensagemColumn();
