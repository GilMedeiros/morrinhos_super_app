import 'dotenv/config';
import { createApp } from './app';
import { MockWhatsAppProvider } from './providers/MockWhatsAppProvider';
import { N8NWhatsAppProvider } from './providers/N8NWhatsAppProvider';

const PORT = parseInt(process.env.PORT || '3001', 10);
const PROVIDER = process.env.WHATSAPP_PROVIDER || 'mock';

// Seleciona o provedor de WhatsApp conforme a variável de ambiente
let whatsappProvider;

if (PROVIDER === 'mock') {
    whatsappProvider = new MockWhatsAppProvider();
} else if (PROVIDER === 'n8n') {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn('N8N_WEBHOOK_URL not set. Please configure it in .env file.');
        console.warn('Example: N8N_WEBHOOK_URL=http://localhost:5678/webhook/send-whatsapp');
        console.warn('Falling back to mock provider.');
        whatsappProvider = new MockWhatsAppProvider();
    } else {
        whatsappProvider = new N8NWhatsAppProvider(webhookUrl);
    }
} else {
    console.warn(`Unknown provider: ${PROVIDER}. Using mock provider instead.`);
    whatsappProvider = new MockWhatsAppProvider();
}

const app = createApp(whatsappProvider);

app.listen(PORT, 'localhost', () => {
    console.log(`
  ╔════════════════════════════════════════╗
  ║   Dispatcher Service Running           ║
  ╠════════════════════════════════════════╣
  ║   Port: ${PORT}                            ║
  ║   Provider: ${PROVIDER}                     ║
  ║   Base URL: http://localhost:${PORT}    ║
  ╚════════════════════════════════════════╝
  `);
}).on('error', (err) => {
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
});
