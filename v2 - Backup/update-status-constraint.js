const db = require('./config/database');

async function addPausadoToStatusConstraint() {
    const client = await db.pool.connect();

    try {
        console.log('🔧 Atualizando constraint de status para incluir "pausado"...');

        // Remover constraint atual
        console.log('1️⃣ Removendo constraint atual...');
        await client.query('ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_status_check;');

        // Adicionar novo constraint com status "pausado"
        console.log('2️⃣ Adicionando constraint atualizado...');
        const newConstraintQuery = `
            ALTER TABLE queue 
            ADD CONSTRAINT queue_status_check 
            CHECK (status IN ('criado', 'executando', 'pausado', 'concluido', 'cancelado', 'erro', 'pendente', 'enviado'));
        `;

        await client.query(newConstraintQuery);

        console.log('✅ Constraint atualizado com sucesso!');
        console.log('📝 Status válidos: criado, executando, pausado, concluido, cancelado, erro, pendente, enviado');

    } catch (error) {
        console.error('❌ Erro ao atualizar constraint:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

addPausadoToStatusConstraint();
