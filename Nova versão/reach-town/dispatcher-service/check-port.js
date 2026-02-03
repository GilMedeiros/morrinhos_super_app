const net = require('net');

// Verifica se a porta 3001 está aberta
const socket = new net.Socket();

socket.connect(3001, 'localhost', () => {
    console.log('✅ Conexão estabelecida com localhost:3001');
    socket.destroy();
    process.exit(0);
});

socket.on('error', (err) => {
    console.error('❌ Erro ao conectar:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('❌ Timeout ao conectar');
    process.exit(1);
}, 5000);
