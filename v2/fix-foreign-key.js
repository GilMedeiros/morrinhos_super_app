const db = require('./config/database');

async function fixForeignKeyConstraint() {
    const client = await db.pool.connect();

    try {
        console.log('🔧 Atualizando foreign key constraint para usar CASCADE...');

        // Iniciar transação
        await client.query('BEGIN');

        // 1. Remover constraint antiga
        console.log('1️⃣ Removendo constraint antiga...');
        await client.query('ALTER TABLE queue_content DROP CONSTRAINT disparo_solicitacoes_disparo_id_fkey;');

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

        // Verificar se funcionou
        console.log('\n🔍 Verificando nova constraint...');
        const checkQuery = `
            SELECT 
                tc.constraint_name,
                rc.delete_rule,
                rc.update_rule
            FROM 
                information_schema.table_constraints AS tc 
                LEFT JOIN information_schema.referential_constraints AS rc
                  ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'queue_content' 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND tc.constraint_name LIKE '%disparo_id%';
        `;

        const result = await client.query(checkQuery);
        result.rows.forEach(row => {
            console.log(`✅ Constraint: ${row.constraint_name}`);
            console.log(`✅ Delete Rule: ${row.delete_rule}`);
            console.log(`✅ Update Rule: ${row.update_rule}`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao atualizar constraint:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixForeignKeyConstraint();
