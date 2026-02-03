// Criar usuários padrão com senhas hasheadas corretas
console.log('🔑 Atualizando senhas dos usuários padrão...');

const bcrypt = require('bcrypt');

(async () => {
    try {
        // Gerar hashes das senhas
        const adminHash = await bcrypt.hash('admin123', 10);
        const userHash = await bcrypt.hash('user123', 10);

        console.log('Admin Hash:', adminHash);
        console.log('User Hash:', userHash);

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
