const db = require('./config/database');

async function checkUsers() {
    try {
        // Verificar se tabela existe
        const tableCheck = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        `);

        console.log('Tabela users existe?', tableCheck.rows.length > 0);

        if (tableCheck.rows.length > 0) {
            // Ver estrutura da tabela
            const columns = await db.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            `);

            console.log('Colunas da tabela users:');
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
            });

            // Ver dados existentes
            const data = await db.query('SELECT * FROM users LIMIT 5');
            console.log('Dados existentes:', data.rows.length, 'registros');
            data.rows.forEach(row => console.log('  -', row));
        }

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

checkUsers();
