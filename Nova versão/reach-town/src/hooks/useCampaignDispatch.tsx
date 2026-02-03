import { useState } from 'react';
import { dispatcherService } from '@/services/dispatcherService';
import { loggerService } from '@/services/loggerService';
import { supabase } from '@/integrations/supabase/client';

interface SendingStats {
    total: number;
    sent: number;
    failed: number;
    inProgress: boolean;
}

export function useCampaignDispatch() {
    const [stats, setStats] = useState<SendingStats>({
        total: 0,
        sent: 0,
        failed: 0,
        inProgress: false,
    });
    const [error, setError] = useState<string | null>(null);

    /**
     * Dispara uma campanha para todos os seus contatos
     */
    async function dispatchCampaign(campaignId: string, messageBody: string) {
        setError(null);
        setStats({ total: 0, sent: 0, failed: 0, inProgress: true });

        try {
            await loggerService.info('CAMPAIGN_DISPATCH', `Starting dispatch for campaign ${campaignId}`);

            // 1️⃣ Buscar campanha e contatos
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: campaign, error: fetchErr } = await (supabase as any)
                .from('campaigns')
                .select('id, name, contacts')
                .eq('id', campaignId)
                .single();

            if (fetchErr || !campaign) {
                const errorMsg = 'Failed to fetch campaign';
                await loggerService.error('CAMPAIGN_DISPATCH', errorMsg, { campaignId, fetchErr });
                throw new Error(errorMsg);
            }

            await loggerService.info('CAMPAIGN_DISPATCH', `Campaign found: ${campaign.name}`, { campaignId });

            // 2️⃣ Buscar dados dos contatos
            const contactIds: string[] = campaign.contacts || [];
            if (contactIds.length === 0) {
                const errorMsg = 'Campaign has no contacts';
                await loggerService.warning('CAMPAIGN_DISPATCH', errorMsg, { campaignId });
                throw new Error(errorMsg);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: contactsData, error: contactsErr } = await (supabase as any)
                .from('contacts')
                .select('id, name, phone')
                .in('id', contactIds);

            if (contactsErr || !contactsData || contactsData.length === 0) {
                const errorMsg = 'Failed to fetch contacts';
                await loggerService.error('CAMPAIGN_DISPATCH', errorMsg, { campaignId, contactsErr });
                throw new Error(errorMsg);
            }

            await loggerService.info('CAMPAIGN_DISPATCH', `Fetched ${contactsData.length} contacts`, {
                campaignId,
                contactCount: contactsData.length,
            });

            setStats(prev => ({ ...prev, total: contactsData.length }));

            // 3️⃣ Enviar mensagens via Dispatcher
            const results = await dispatcherService.sendCampaignMessages(
                campaignId,
                contactsData,
                messageBody,
                (sent, total) => {
                    setStats(prev => ({
                        ...prev,
                        sent,
                        failed: total - sent,
                    }));
                }
            );

            await loggerService.info('CAMPAIGN_DISPATCH', `All messages sent, processing results`, {
                campaignId,
                results: results.length,
            });

            // 4️⃣ Armazenar resultados no Supabase
            const messageLogs = results.map(result => ({
                campaign_id: campaignId,
                contact_id: result.contactId,
                message_id: result.messageId,
                status: result.status,
                error: result.error || null,
                sent_at: new Date().toISOString(),
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: logErr } = await (supabase as any).from('message_logs').insert(messageLogs);

            if (logErr) {
                await loggerService.error('CAMPAIGN_DISPATCH', 'Error storing message logs', {
                    campaignId,
                    logErr,
                });
            } else {
                await loggerService.success('CAMPAIGN_DISPATCH', `Stored ${messageLogs.length} message logs`, {
                    campaignId,
                });
            }

            // 5️⃣ Atualizar status da campanha
            const sentCount = results.filter(r => r.status !== 'failed').length;
            const failedCount = results.filter(r => r.status === 'failed').length;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('campaigns')
                .update({
                    status: 'dispatched',
                    sent_count: sentCount,
                    failed_count: failedCount,
                    dispatched_at: new Date().toISOString(),
                })
                .eq('id', campaignId);

            await loggerService.success('CAMPAIGN_DISPATCH', `Campaign dispatch completed`, {
                campaignId,
                sentCount,
                failedCount,
                totalContacts: contactsData.length,
            });

            setStats(prev => ({
                ...prev,
                sent: sentCount,
                failed: failedCount,
                inProgress: false,
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            await loggerService.error('CAMPAIGN_DISPATCH', `Dispatch failed: ${errorMessage}`, {
                error: err,
            });
            setError(errorMessage);
            setStats(prev => ({ ...prev, inProgress: false }));
            throw err;
        }
    }

    return {
        stats,
        error,
        dispatchCampaign,
    };
}
