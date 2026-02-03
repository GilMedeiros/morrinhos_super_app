const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'solicitacoes'
`)
    .then(result => {
        console.log('Colunas da tabela solicitacoes:');
        for (const row of result.rows) {
            console.log(`- ${row.column_name}`);
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('Erro ao consultar colunas:', err);
        process.exit(1);
    });
