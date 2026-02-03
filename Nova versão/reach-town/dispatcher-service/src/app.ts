import express, { Express } from 'express';
import cors from 'cors';
import { createMessageRoutes } from './routes/messageRoutes';
import { apiKeyMiddleware } from './middleware/apiKeyMiddleware';
import { IWhatsAppProvider } from './providers/IWhatsAppProvider';

/**
 * Factory para criar a aplicação Express
 */
export function createApp(whatsappProvider: IWhatsAppProvider): Express {
    const app = express();

    // Middlewares globais
    app.use(cors());
    app.use(express.json());

    // Health check sem autenticação
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });

    // Rotas de mensagens protegidas (com autenticação)
    app.use('/v1/messages', apiKeyMiddleware, createMessageRoutes(whatsappProvider));

    // Rota 404
    app.use((req, res) => {
        res.status(404).json({ error: 'Route not found' });
    });

    return app;
}
