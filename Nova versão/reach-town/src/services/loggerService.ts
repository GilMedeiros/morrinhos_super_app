/**
 * Serviço centralizado para registrar logs de toda a aplicação
 * Envia logs para Supabase e também console em desenvolvimento
 */

import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug' | 'success';

export interface LogEntry {
    level: LogLevel;
    module: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp?: string;
    userId?: string;
}

class LoggerService {
    private isDevelopment = import.meta.env.DEV;

    /**
     * Log genérico com nível customizável
     */
    async log(
        level: LogLevel,
        module: string,
        message: string,
        details?: Record<string, unknown>
    ): Promise<void> {
        const timestamp = new Date().toISOString();
        const entry: LogEntry = {
            level,
            module,
            message,
            details,
            timestamp,
        };

        // Log no console em desenvolvimento
        if (this.isDevelopment) {
            if (level === 'error') {
                console.error(
                    `[${timestamp}] [${module}] [${level.toUpperCase()}] ${message}`,
                    details
                );
            } else if (level === 'warning') {
                console.warn(
                    `[${timestamp}] [${module}] [${level.toUpperCase()}] ${message}`,
                    details
                );
            } else {
                console.log(
                    `[${timestamp}] [${module}] [${level.toUpperCase()}] ${message}`,
                    details
                );
            }
        }

        // Enviar para Supabase
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('logs').insert({
                level,
                module,
                message,
                details: details ? JSON.stringify(details) : null,
                created_at: timestamp,
            });
        } catch (err) {
            // Falhar silenciosamente se não conseguir salvar no Supabase
            if (this.isDevelopment) {
                console.error('Failed to save log to Supabase:', err);
            }
        }
    }

    // Métodos convenientes
    info(module: string, message: string, details?: Record<string, unknown>): Promise<void> {
        return this.log('info', module, message, details);
    }

    warning(module: string, message: string, details?: Record<string, unknown>): Promise<void> {
        return this.log('warning', module, message, details);
    }

    error(module: string, message: string, details?: Record<string, unknown>): Promise<void> {
        return this.log('error', module, message, details);
    }

    debug(module: string, message: string, details?: Record<string, unknown>): Promise<void> {
        return this.log('debug', module, message, details);
    }

    success(module: string, message: string, details?: Record<string, unknown>): Promise<void> {
        return this.log('success', module, message, details);
    }

    /**
     * Log para erros de dispatch
     */
    async logDispatchError(
        campaignId: string,
        contactId: string,
        error: string,
        details?: Record<string, unknown>
    ): Promise<void> {
        await this.error('DISPATCHER', `Dispatch failed for contact ${contactId} in campaign ${campaignId}`, {
            campaignId,
            contactId,
            error,
            ...details,
        });
    }

    /**
     * Log para sucesso de dispatch
     */
    async logDispatchSuccess(
        campaignId: string,
        contactId: string,
        messageId: string,
        details?: Record<string, unknown>
    ): Promise<void> {
        await this.success('DISPATCHER', `Message sent to contact ${contactId}`, {
            campaignId,
            contactId,
            messageId,
            ...details,
        });
    }

    /**
     * Buscar logs da aplicação
     */
    async getLogs(
        module?: string,
        level?: LogLevel,
        limit: number = 100
    ): Promise<Array<unknown>> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let query = (supabase as any).from('logs').select('*');

            if (module) {
                query = query.eq('module', module);
            }

            if (level) {
                query = query.eq('level', level);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Failed to fetch logs:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('Error fetching logs:', err);
            return [];
        }
    }

    /**
     * Limpar logs antigos (mais de 30 dias)
     */
    async cleanOldLogs(): Promise<void> {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('logs')
                .delete()
                .lt('created_at', thirtyDaysAgo);

            if (error) {
                console.error('Failed to clean old logs:', error);
            }
        } catch (err) {
            console.error('Error cleaning logs:', err);
        }
    }
}

export const loggerService = new LoggerService();
