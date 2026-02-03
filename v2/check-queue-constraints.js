const db = require('./config/database');

async function checkQueueConstraints() {
    const client = await db.pool.connect();

    try {
        console.log('🔍 Verificando constraints da tabela queue...');

        // Verificar constraints
        const query = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'queue'::regclass 
            AND contype = 'c';
        `;

        const result = await client.query(query);

        console.log('📋 Constraints encontrados:');
        result.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}: ${row.constraint_definition}`);
        });

    } catch (error) {
        console.error('❌ Erro ao verificar constraints:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkQueueConstraints();
