const db = require('./config/database');

async function checkCorrectDatabase() {
    const client = await db.pool.connect();

    try {
        console.log('🔍 Verificando banco morrinhos_arrecadacao...');

        // Listar todas as tabelas
        const tablesQuery = `
            SELECT table_name, table_schema 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;

        const tablesResult = await client.query(tablesQuery);
        console.log('\n📋 Tabelas encontradas:');
        tablesResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Verificar foreign keys existentes
        const foreignKeysQuery = `
            SELECT 
                tc.table_name, 
                tc.constraint_name, 
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule,
                rc.update_rule
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                LEFT JOIN information_schema.referential_constraints AS rc
                  ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            ORDER BY tc.table_name, tc.constraint_name;
        `;

        const fkResult = await client.query(foreignKeysQuery);
        console.log('\n🔗 Foreign keys encontradas:');
        if (fkResult.rows.length === 0) {
            console.log('   ❌ Nenhuma foreign key encontrada!');
        } else {
            fkResult.rows.forEach(row => {
                console.log(`  - ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
                console.log(`    Constraint: ${row.constraint_name}`);
                console.log(`    Delete Rule: ${row.delete_rule}`);
                console.log(`    Update Rule: ${row.update_rule}`);
                console.log('');
            });
        }

        // Verificar dados nas tabelas queue e queue_content
        console.log('📊 Verificando dados...');

        try {
            const queueCount = await client.query('SELECT COUNT(*) FROM queue');
            console.log(`Queue: ${queueCount.rows[0].count} registros`);

            const queueContentCount = await client.query('SELECT COUNT(*) FROM queue_content');
            console.log(`Queue Content: ${queueContentCount.rows[0].count} registros`);

            // Verificar se existem registros órfãos
            const orphanQuery = `
                SELECT COUNT(*) as orphan_count
                FROM queue_content qc
                LEFT JOIN queue q ON qc.disparo_id = q.id
                WHERE q.id IS NULL
            `;
            const orphanResult = await client.query(orphanQuery);
            console.log(`Registros órfãos em queue_content: ${orphanResult.rows[0].orphan_count}`);

        } catch (e) {
            console.log('❌ Erro ao verificar dados:', e.message);
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkCorrectDatabase();
