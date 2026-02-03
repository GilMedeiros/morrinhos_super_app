const db = require('./config/database');

async function fixQueueStatusConstraint() {
    const client = await db.pool.connect();

    try {
        console.log('🔧 Corrigindo constraint de status da tabela queue...');

        // Primeiro, remover o constraint antigo
        console.log('1️⃣ Removendo constraint antigo...');
        await client.query('ALTER TABLE queue DROP CONSTRAINT IF EXISTS disparos_status_check;');

        // Adicionar novo constraint com os valores corretos
        console.log('2️⃣ Adicionando novo constraint...');
        const newConstraintQuery = `
            ALTER TABLE queue 
            ADD CONSTRAINT queue_status_check 
            CHECK (status IN ('criado', 'executando', 'concluido', 'cancelado', 'erro', 'pendente', 'enviado'));
        `;

        await client.query(newConstraintQuery);

        console.log('✅ Constraint de status corrigido com sucesso!');
        console.log('📝 Valores válidos agora: criado, executando, concluido, cancelado, erro, pendente, enviado');

    } catch (error) {
        console.error('❌ Erro ao corrigir constraint:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixQueueStatusConstraint();
