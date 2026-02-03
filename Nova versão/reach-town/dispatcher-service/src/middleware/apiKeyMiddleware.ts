import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de autenticação via API Key
 * Verifica se o header X-API-Key contém a chave correta
 */
export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKey = process.env.API_KEY || 'default-dev-key';

    if (!apiKey) {
        res.status(401).json({ error: 'Missing X-API-Key header' });
        return;
    }

    if (apiKey !== validApiKey) {
        res.status(401).json({ error: 'Invalid API Key' });
        return;
    }

    next();
}
