/**
 * Tipos e interfaces para o Dispatcher Service
 */

export interface SendMessageRequest {
    recipient_phone: string;
    message_body: string;
    external_id: string; // ID da campanha_contato para rastreamento
}

export interface SendMessageResponse {
    status: 'queued' | 'sent' | 'failed';
    message_id: string;
    provider_details?: Record<string, unknown>;
    error?: string;
}

export interface WhatsAppProviderResponse {
    success: boolean;
    details: Record<string, unknown>;
}

export interface ApiKeyConfig {
    key: string;
    active: boolean;
    description?: string;
}
