import { useCallback } from 'react';
import { useToast } from './use-toast';
import { loggerService } from '@/services/loggerService';

interface SendMessageParams {
    phone: string;
    message: string;
    conversationId: string;
    contactName?: string;
    sentBy?: string;
    sentByName?: string;
    sentAt?: string;
}

interface DispatcherResponse {
    status: 'queued' | 'sent' | 'failed';
    message_id: string;
    provider_details?: Record<string, unknown>;
    error?: string;
}

/**
 * Hook para enviar mensagens via Dispatcher Service (N8N Provider)
 * Usado no chat para enviar mensagens de atendentes para WhatsApp
 */
export function useSendChatMessage() {
    const { toast } = useToast();

    const sendMessage = useCallback(
        async (params: SendMessageParams): Promise<boolean> => {
            const { phone, message, conversationId, contactName, sentBy, sentByName, sentAt } = params;

            try {
                console.log('[useSendChatMessage] Enviando mensagem...', {
                    phone,
                    conversationId,
                    contactName,
                    sentBy,
                    sentByName,
                });

                await loggerService.info('CHAT', 'Message send started', {
                    phone,
                    conversationId,
                    contactName,
                    sentBy,
                    sentByName,
                    messageLength: message.length,
                });

                // Chamar Dispatcher Service com todas as informações
                const response = await fetch(
                    'http://localhost:3001/v1/messages/send',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'dev-api-key-12345', // Usar variável de ambiente em produção
                        },
                        body: JSON.stringify({
                            recipient_phone: phone,
                            message_body: message,
                            external_id: conversationId,
                            // Informações adicionais para o N8N
                            chat_metadata: {
                                origin: 'chat',
                                sent_by: sentBy,
                                sent_by_name: sentByName,
                                sent_at: sentAt || new Date().toISOString(),
                                contact_name: contactName,
                                source_type: 'attendant', // Mensagem de atendente
                            },
                        }),
                    }
                );

                if (!response.ok) {
                    const errorData = (await response.json()) as {
                        error?: string;
                        message?: string;
                    };
                    const errorMsg = errorData.error || errorData.message || 'Erro desconhecido';

                    await loggerService.error('CHAT', 'Message send failed', {
                        phone,
                        conversationId,
                        status: response.status,
                        error: errorMsg,
                    });

                    toast({
                        title: 'Erro ao enviar mensagem',
                        description: `${response.status}: ${errorMsg}`,
                        variant: 'destructive',
                    });

                    return false;
                }

                const data: DispatcherResponse = await response.json();

                await loggerService.success('CHAT', 'Message sent successfully', {
                    phone,
                    conversationId,
                    messageId: data.message_id,
                    status: data.status,
                    providerDetails: data.provider_details,
                });

                if (data.status === 'failed') {
                    toast({
                        title: 'Mensagem não enviada',
                        description: data.error || 'Erro ao enviar via N8N',
                        variant: 'destructive',
                    });
                    return false;
                }

                toast({
                    title: 'Mensagem enviada',
                    description: `ID: ${data.message_id}`,
                });

                return true;
            } catch (error) {
                const errorMsg =
                    error instanceof Error ? error.message : 'Erro desconhecido';

                await loggerService.error('CHAT', 'Message send error', {
                    phone,
                    conversationId,
                    error: errorMsg,
                });

                toast({
                    title: 'Erro ao enviar mensagem',
                    description: errorMsg,
                    variant: 'destructive',
                });

                return false;
            }
        },
        [toast]
    );

    return { sendMessage };
}
