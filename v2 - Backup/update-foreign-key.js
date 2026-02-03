const db = require('./config/database');

async function updateForeignKeyConstraint() {
    const client = await db.pool.connect();

    try {
        console.log('🔧 Atualizando foreign key constraint para usar CASCADE...');

        // Iniciar transação
        await client.query('BEGIN');

        // 1. Remover constraint antiga
        console.log('1️⃣ Removendo constraint antiga...');
        await client.query('ALTER TABLE queue_content DROP CONSTRAINT IF EXISTS disparo_solicitacoes_disparo_id_fkey;');

        // 2. Criar nova constraint com CASCADE
        console.log('2️⃣ Criando nova constraint com DELETE CASCADE...');
        const newConstraintQuery = `
            ALTER TABLE queue_content 
            ADD CONSTRAINT queue_content_disparo_id_fkey 
            FOREIGN KEY (disparo_id) 
            REFERENCES queue(id) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
        `;

        await client.query(newConstraintQuery);

        // Commit da transação
        await client.query('COMMIT');

        console.log('✅ Foreign key constraint atualizado com sucesso!');
        console.log('📝 Agora quando um disparo for deletado, todos os registros relacionados em queue_content serão removidos automaticamente');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao atualizar constraint:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

updateForeignKeyConstraint();
