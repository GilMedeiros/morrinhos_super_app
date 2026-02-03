
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { IWhatsAppProvider } from '../providers/IWhatsAppProvider';
import { SendMessageRequest, SendMessageResponse } from '../types/index';
import { pool } from '../integrations/postgres';

/**
 * Controller para gerenciar envios de mensagens
 */
export class MessageController {
    constructor(private whatsappProvider: IWhatsAppProvider) { }

    /**
     * Endpoint para enviar uma mensagem
     * POST /v1/messages/send
     */
    async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            const { recipient_phone, message_body, external_id, ...extraFields } = req.body as SendMessageRequest & Record<string, unknown>;

            // Validações
            if (!recipient_phone || !message_body || !external_id) {
                res.status(400).json({
                    error: 'Missing required fields: recipient_phone, message_body, external_id',
                });
                return;
            }

            // Valida se o telefone tem um formato mínimo válido
            if (!/^\+?[0-9]{10,15}$/.test(recipient_phone.replace(/\D/g, ''))) {
                res.status(400).json({
                    error: 'Invalid phone number format',
                });
                return;
            }

            // Gera um ID único para a mensagem
            const messageId = `msg-${randomUUID()}`;

            // Chama o provedor de WhatsApp
            const providerResponse = await this.whatsappProvider.sendMessage(
                recipient_phone,
                message_body,
                external_id,
                extraFields
            );

            const response: SendMessageResponse = {
                status: providerResponse.success ? 'queued' : 'failed',
                message_id: messageId,
                provider_details: providerResponse.details,
                error: providerResponse.success ? undefined : 'Failed to send message',
            };

            res.status(200).json(response);
        } catch (error) {
            console.error('Error in sendMessage:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
 * Endpoint para receber mensagem recebida do WhatsApp / N8N
 * POST /v1/messages/incoming
 */
    async receiveIncomingMessage(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body;
            const supabaseFunctionUrl = 'https://jxnopzcqptdzzdwxploc.supabase.co/functions/v1/save-incoming-message';
            const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bm9wemNxcHRkenpkd3hwbG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTI3ODUsImV4cCI6MjA3NjI4ODc4NX0.HOqoHS6KySw74r1Ht6_87X04fleAo8taQpcgZJvU2Pg';
            console.log('Incoming message body forward to Supabase Function:', JSON.stringify(body, null, 2));
            const response = await fetch(supabaseFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            console.log('Supabase Function response:', response.status, data);
            if (!response.ok) {
                res.status(response.status).json(data);
            } else {
                res.status(200).json(data);
            }
        } catch (error) {
            console.error('Error in receiveIncomingMessage:', error);
            res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
}
