import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCampaignDispatch } from '@/hooks/useCampaignDispatch';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface DispatchCampaignModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaignId: string;
    campaignName: string;
    onDispatchComplete?: () => void;
}

export default function DispatchCampaignModal({
    open,
    onOpenChange,
    campaignId,
    campaignName,
    onDispatchComplete,
}: DispatchCampaignModalProps) {
    const [messageBody, setMessageBody] = useState('');
    const { stats, error, dispatchCampaign } = useCampaignDispatch();

    async function handleDispatch() {
        if (!messageBody.trim()) {
            alert('Por favor, digite a mensagem');
            return;
        }

        try {
            await dispatchCampaign(campaignId, messageBody);
            if (onDispatchComplete) {
                onDispatchComplete();
            }
            // Fechar após 2 segundos de sucesso
            setTimeout(() => {
                onOpenChange(false);
                setMessageBody('');
            }, 2000);
        } catch (err) {
            console.error('Dispatch failed:', err);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Disparar Campanha: {campaignName}</DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        <div className="flex gap-2 items-start">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>{error}</div>
                        </div>
                    </div>
                )}

                {!stats.inProgress && stats.total === 0 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="message">Mensagem</Label>
                            <textarea
                                id="message"
                                value={messageBody}
                                onChange={e => setMessageBody(e.target.value)}
                                placeholder="Digite a mensagem que será enviada para todos os contatos..."
                                className="w-full min-h-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                                disabled={stats.inProgress}
                            />
                        </div>
                    </div>
                )}

                {stats.inProgress && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm font-medium">Disparando mensagens...</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progresso</span>
                                <span className="font-medium">
                                    {stats.sent + stats.failed} / {stats.total}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-300"
                                    style={{
                                        width: stats.total > 0 ? `${((stats.sent + stats.failed) / stats.total) * 100}%` : '0%',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="rounded-lg bg-green-50 p-3">
                                <p className="text-2xl font-bold text-green-700">{stats.sent}</p>
                                <p className="text-xs text-green-600">Enviados</p>
                            </div>
                            <div className="rounded-lg bg-red-50 p-3">
                                <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
                                <p className="text-xs text-red-600">Falharam</p>
                            </div>
                        </div>
                    </div>
                )}

                {!stats.inProgress && stats.total > 0 && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                            <p className="font-medium">Disparo Concluído!</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="rounded-lg bg-green-50 p-3">
                                <p className="text-2xl font-bold text-green-700">{stats.sent}</p>
                                <p className="text-xs text-green-600">Enviados</p>
                            </div>
                            <div className="rounded-lg bg-red-50 p-3">
                                <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
                                <p className="text-xs text-red-600">Falharam</p>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground text-center">
                            Total: {stats.sent + stats.failed} de {stats.total} mensagens
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false);
                            setMessageBody('');
                        }}
                        disabled={stats.inProgress}
                    >
                        {stats.inProgress ? 'Aguarde...' : stats.total > 0 ? 'Fechar' : 'Cancelar'}
                    </Button>
                    {!stats.inProgress && stats.total === 0 && (
                        <Button type="button" onClick={handleDispatch} disabled={!messageBody.trim()}>
                            Disparar para Todos
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
