const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const sql = `
  ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS unidade VARCHAR(100);
  UPDATE solicitacoes SET unidade = 'Não informada' WHERE unidade IS NULL;
`;

pool.query(sql)
    .then(() => {
        console.log('Migração executada com sucesso!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Erro ao executar migração:', err);
        process.exit(1);
    });
