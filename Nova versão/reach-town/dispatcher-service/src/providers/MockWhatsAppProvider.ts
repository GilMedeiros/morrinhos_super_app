import { IWhatsAppProvider } from './IWhatsAppProvider';
import { WhatsAppProviderResponse } from '../types/index';

/**
 * Provedor fake de WhatsApp para desenvolvimento e testes
 * Simula o comportamento sem fazer chamadas reais
 */
export class MockWhatsAppProvider implements IWhatsAppProvider {
    async sendMessage(
        phone: string,
        message: string,
        externalId: string
    ): Promise<WhatsAppProviderResponse> {
        console.log(`
    [MOCK WHATSAPP SEND]
    ├─ Phone: ${phone}
    ├─ External ID: ${externalId}
    ├─ Message: "${message}"
    └─ Status: Queued for sending
    `);

        // Simula um pequeno delay
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
            success: true,
            details: {
                mock_id: `mock-${Date.now()}`,
                provider: 'mock',
                queued_at: new Date().toISOString(),
            },
        };
    }
}
