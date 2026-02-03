const db = require('./config/database');

async function checkForeignKeyConstraints() {
    const client = await db.pool.connect();

    try {
        console.log('🔍 Verificando constraints de chave estrangeira da tabela queue...');

        // Verificar constraints de foreign key
        const query = `
            SELECT 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                tc.constraint_name,
                rc.delete_rule
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
                LEFT JOIN information_schema.referential_constraints AS rc
                  ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND (ccu.table_name='queue' OR tc.table_name='queue');
        `;

        const result = await client.query(query);

        console.log('📋 Foreign Key Constraints encontrados:');
        result.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}:`);
            console.log(`    Tabela: ${row.table_name}.${row.column_name}`);
            console.log(`    Referencia: ${row.foreign_table_name}.${row.foreign_column_name}`);
            console.log(`    Delete Rule: ${row.delete_rule || 'NO ACTION'}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Erro ao verificar constraints:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkForeignKeyConstraints();
