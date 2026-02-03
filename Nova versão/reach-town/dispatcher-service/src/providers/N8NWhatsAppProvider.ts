import { IWhatsAppProvider } from './IWhatsAppProvider';
import { WhatsAppProviderResponse } from '../types/index';

interface N8NWebhookResponse {
    message_id?: string;
    status?: string;
    [key: string]: unknown;
}

/**
 * Provedor N8N para WhatsApp
 * Envia mensagens através de um webhook N8N
 * O N8N fica responsável por integração com WhatsApp, Twilio, etc
 */
export class N8NWhatsAppProvider implements IWhatsAppProvider {
    private webhookUrl: string;

    constructor(webhookUrl?: string) {
        // Usar variável de ambiente ou valor padrão
        this.webhookUrl = webhookUrl || process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/send-whatsapp';
    }

    async sendMessage(
        phone: string,
        message: string,
        externalId: string,
        extraFields: Record<string, unknown> = {}
    ): Promise<WhatsAppProviderResponse> {
        try {
            const payload = {
                phone,
                message,
                externalId,
                timestamp: new Date().toISOString(),
                ...extraFields,
            };
            console.log('[N8N WHATSAPP SEND] Sending payload to N8N:', payload);

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`N8N Webhook error: ${response.status} - ${errorBody}`);

                return {
                    success: false,
                    details: {
                        provider: 'n8n',
                        status: response.status,
                        error: errorBody,
                    },
                };
            }

            const data: N8NWebhookResponse = await response.json();

            console.log(`
    [N8N WHATSAPP SUCCESS]
    ├─ Phone: ${phone}
    ├─ Response: ${JSON.stringify(data)}
    └─ Status: Message queued
    `);

            return {
                success: true,
                details: {
                    n8n_response: data,
                    provider: 'n8n',
                    sent_at: new Date().toISOString(),
                    message_id: data.message_id || `n8n-${Date.now()}`,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            console.error(`
    [N8N WHATSAPP ERROR]
    ├─ Phone: ${phone}
    ├─ Error: ${errorMessage}
    └─ Status: Failed
    `);

            return {
                success: false,
                details: {
                    provider: 'n8n',
                    error: errorMessage,
                    webhook_url: this.webhookUrl,
                },
            };
        }
    }
}
