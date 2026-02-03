/**
 * Serviço cliente para comunicação com o Dispatcher Service
 */

import { loggerService } from './loggerService';

interface SendMessageRequest {
    recipient_phone: string;
    message_body: string;
    external_id: string;
}

interface SendMessageResponse {
    status: 'queued' | 'sent' | 'failed';
    message_id: string;
    provider_details?: Record<string, unknown>;
    error?: string;
}

export class DispatcherService {
    private apiUrl: string;
    private apiKey: string;

    constructor(apiUrl: string = 'http://localhost:3001', apiKey: string = 'dev-api-key-12345') {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }

    /**
     * Verifica se o Dispatcher Service está disponível
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
            });
            return response.ok;
        } catch (error) {
            console.error('Dispatcher health check failed:', error);
            return false;
        }
    }

    /**
     * Envia uma mensagem através do Dispatcher
     */
    async sendMessage(
        recipientPhone: string,
        messageBody: string,
        externalId: string
    ): Promise<SendMessageResponse> {
        try {
            const request: SendMessageRequest = {
                recipient_phone: recipientPhone,
                message_body: messageBody,
                external_id: externalId,
            };

            const response = await fetch(`${this.apiUrl}/v1/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify(request),
            });

            const data = (await response.json()) as SendMessageResponse;

            if (!response.ok) {
                const errorMsg = data.error || 'Failed to send message';
                await loggerService.error('DISPATCHER_SERVICE', `Send failed for ${recipientPhone}`, {
                    externalId,
                    status: response.status,
                    error: errorMsg,
                });
                return {
                    status: 'failed',
                    message_id: '',
                    error: errorMsg,
                };
            }

            await loggerService.success('DISPATCHER_SERVICE', `Message sent to ${recipientPhone}`, {
                externalId,
                messageId: data.message_id,
            });

            return data;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            await loggerService.error('DISPATCHER_SERVICE', `Send error for ${recipientPhone}`, {
                externalId,
                error: errorMsg,
            });
            return {
                status: 'failed',
                message_id: '',
                error: errorMsg,
            };
        }
    }

    /**
     * Envia mensagens para múltiplos contatos (campanha)
     */
    async sendCampaignMessages(
        campaignId: string,
        contacts: Array<{ id: string; phone: string; name: string }>,
        messageBody: string,
        onProgress?: (sent: number, total: number) => void
    ): Promise<Array<{ contactId: string; messageId: string; status: string; error?: string }>> {
        const results: Array<{ contactId: string; messageId: string; status: string; error?: string }> = [];

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const externalId = `campaign_${campaignId}_contact_${contact.id}`;

            try {
                const response = await this.sendMessage(contact.phone, messageBody, externalId);

                results.push({
                    contactId: contact.id,
                    messageId: response.message_id,
                    status: response.status,
                    error: response.error,
                });
            } catch (error) {
                results.push({
                    contactId: contact.id,
                    messageId: '',
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }

            // Callback de progresso
            if (onProgress) {
                onProgress(i + 1, contacts.length);
            }

            // Pequeno delay para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }
}

// Exportar instância singleton
export const dispatcherService = new DispatcherService();
