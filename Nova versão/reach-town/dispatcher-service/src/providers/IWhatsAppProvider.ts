import { WhatsAppProviderResponse } from '../types/index';

/**
 * Interface que todos os provedores de WhatsApp devem implementar
 * Permite trocar de provedor facilmente no futuro
 */
export interface IWhatsAppProvider {
    sendMessage(
        phone: string,
        message: string,
        externalId: string,
        extraFields?: Record<string, unknown>
    ): Promise<WhatsAppProviderResponse>;
}
