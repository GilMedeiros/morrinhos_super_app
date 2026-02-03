const db = require('./config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createUsersTable() {
    console.log('🔄 Criando tabela de autenticação...');

    try {
        // Criar tabela primeiro
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS auth_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await db.query(createTableSql);
        console.log('✅ Tabela auth_users criada!');

        // Criar índices
        const indexSql = `
            CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
            CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
            CREATE INDEX IF NOT EXISTS idx_auth_users_active ON auth_users(active);
        `;
        await db.query(indexSql);
        console.log('✅ Índices criados!');

        // Criar função e trigger
        const triggerSql = `
            CREATE OR REPLACE FUNCTION update_auth_users_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_auth_users_updated_at ON auth_users;
            CREATE TRIGGER update_auth_users_updated_at 
                BEFORE UPDATE ON auth_users 
                FOR EACH ROW 
                EXECUTE FUNCTION update_auth_users_updated_at();
        `;
        await db.query(triggerSql);
        console.log('✅ Triggers criados!');

        // Criar usuários padrão
        console.log('🔑 Criando usuários padrão...');

        // Gerar hashes das senhas
        const adminHash = await bcrypt.hash('admin123', 10);
        const userHash = await bcrypt.hash('user123', 10);

        // Inserir usuários padrão
        const insertSql = `
            INSERT INTO auth_users (username, password, name, role) VALUES 
            ($1, $2, $3, $4),
            ($5, $6, $7, $8)
            ON CONFLICT (username) DO NOTHING
        `;

        const result = await db.query(insertSql, [
            'admin', adminHash, 'Administrador', 'admin',
            'user', userHash, 'Usuário', 'user'
        ]);

        console.log('✅ Usuários padrão criados!');
        console.log('');
        console.log('👤 Credenciais de acesso:');
        console.log('   Administrador: admin / admin123');
        console.log('   Usuário:       user / user123');
        console.log('');
        console.log('🚀 Sistema de autenticação pronto para uso!');

    } catch (error) {
        console.error('❌ Erro ao criar tabela de usuários:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createUsersTable()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = createUsersTable;
