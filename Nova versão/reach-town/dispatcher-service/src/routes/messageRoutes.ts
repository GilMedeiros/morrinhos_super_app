import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';
import { IWhatsAppProvider } from '../providers/IWhatsAppProvider';

/**
 * Factory para criar as rotas de mensagens
 */
export function createMessageRoutes(whatsappProvider: IWhatsAppProvider): Router {
    const router = Router();
    const controller = new MessageController(whatsappProvider);

    // Rota para enviar mensagem
    router.post('/send', (req, res) => controller.sendMessage(req, res));

    // Rota para receber mensagem recebida do WhatsApp
    router.post('/incoming', (req, res) => controller.receiveIncomingMessage(req, res));

    return router;
}
