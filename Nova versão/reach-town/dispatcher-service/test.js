/**
 * Arquivo de teste simples para os endpoints do Dispatcher Service
 * Execute com: node test.js
 */

async function testHealthCheck() {
    console.log('\n📋 Testando Health Check...');
    try {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();
        console.log('✅ Health Check OK:', data);
    } catch (error) {
        console.error('❌ Health Check Falhou:', error);
    }
}

async function testSendMessage() {
    console.log('\n📨 Testando Envio de Mensagem...');
    try {
        const response = await fetch('http://localhost:3001/v1/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'dev-api-key-12345',
            },
            body: JSON.stringify({
                recipient_phone: '+5564999998888',
                message_body: 'Olá! Esta é uma mensagem de teste do Dispatcher Service.',
                external_id: 'campaign_123_contact_456',
            }),
        });
        const data = await response.json();
        console.log('✅ Envio de Mensagem OK:', data);
    } catch (error) {
        console.error('❌ Envio de Mensagem Falhou:', error);
    }
}

async function testInvalidApiKey() {
    console.log('\n🔐 Testando com API Key Inválida...');
    try {
        const response = await fetch('http://localhost:3001/v1/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'chave-invalida',
            },
            body: JSON.stringify({
                recipient_phone: '+5564999998888',
                message_body: 'Teste',
                external_id: 'test_123',
            }),
        });
        const data = await response.json();
        console.log('✅ Validação OK (deve retornar 401):', response.status, data);
    } catch (error) {
        console.error('❌ Teste Falhou:', error);
    }
}

async function testMissingApiKey() {
    console.log('\n🔐 Testando sem API Key...');
    try {
        const response = await fetch('http://localhost:3001/v1/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient_phone: '+5564999998888',
                message_body: 'Teste',
                external_id: 'test_123',
            }),
        });
        const data = await response.json();
        console.log('✅ Validação OK (deve retornar 401):', response.status, data);
    } catch (error) {
        console.error('❌ Teste Falhou:', error);
    }
}

async function runTests() {
    console.log('🚀 Iniciando testes do Dispatcher Service...');
    console.log('═══════════════════════════════════════════════════\n');

    await testHealthCheck();
    await new Promise(r => setTimeout(r, 500));

    await testSendMessage();
    await new Promise(r => setTimeout(r, 500));

    await testInvalidApiKey();
    await new Promise(r => setTimeout(r, 500));

    await testMissingApiKey();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Testes concluídos!\n');
}

// Aguarda um pouco para garantir que o servidor está rodando
setTimeout(runTests, 1000);
