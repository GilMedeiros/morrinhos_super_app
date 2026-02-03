#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações do banco de dados
const DB_HOST = process.env.DB_HOST || '76.13.82.92';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'morrinhos_arrecadacao';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'b2a4e40a9b27ed14cc0b08007f346de0';

// Arquivo de migração
const migrationFile = path.join(__dirname, 'migration_create_users_table.sql');

console.log('🔄 Executando migração da tabela de usuários...');

try {
    // Verificar se o arquivo de migração existe
    if (!fs.existsSync(migrationFile)) {
        console.error('❌ Arquivo de migração não encontrado:', migrationFile);
        process.exit(1);
    }

    // Construir comando psql
    const psqlCommand = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${migrationFile}"`;

    console.log('📝 Executando comando:', psqlCommand.replace(DB_PASSWORD, '***'));

    // Definir variável de ambiente para senha
    process.env.PGPASSWORD = DB_PASSWORD;

    // Executar migração
    const output = execSync(psqlCommand, {
        encoding: 'utf8',
        stdio: 'pipe'
    });

    console.log('✅ Migração executada com sucesso!');
    console.log('📄 Saída:', output);

    // Criar usuários padrão com senhas hasheadas corretas
    console.log('🔑 Atualizando senhas dos usuários padrão...');

    const bcrypt = require('bcrypt');
    const db = require('./config/database');

    (async () => {
        try {
            // Gerar hashes das senhas
            const adminHash = await bcrypt.hash('admin123', 10);
            const userHash = await bcrypt.hash('user123', 10);

            // Atualizar senhas no banco
            await db.query('UPDATE users SET password = $1 WHERE username = $2', [adminHash, 'admin']);
            await db.query('UPDATE users SET password = $1 WHERE username = $2', [userHash, 'user']);

            console.log('✅ Senhas dos usuários padrão atualizadas!');
            console.log('');
            console.log('👤 Usuários criados:');
            console.log('   Admin: admin / admin123');
            console.log('   User:  user / user123');
            console.log('');
            console.log('🚀 Sistema de autenticação pronto para uso!');

            process.exit(0);
        } catch (error) {
            console.error('❌ Erro ao atualizar senhas:', error.message);
            process.exit(1);
        }
    })();

} catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);

    if (error.message.includes('psql: command not found')) {
        console.log('💡 Dica: Certifique-se de que o PostgreSQL está instalado e o comando psql está disponível no PATH');
    }

    if (error.message.includes('authentication failed')) {
        console.log('💡 Dica: Verifique as credenciais do banco de dados no arquivo .env');
    }

    process.exit(1);
}
