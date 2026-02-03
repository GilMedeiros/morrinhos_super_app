import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { loggerService } from '@/services/loggerService';
import { AlertCircle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LogSummary {
    total: number;
    errors: number;
    warnings: number;
    successCount: number;
    lastError?: string;
    lastErrorTime?: string;
}

export default function RecentLogsCard() {
    const [summary, setSummary] = useState<LogSummary>({
        total: 0,
        errors: 0,
        warnings: 0,
        successCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    async function fetchLogsSummary() {
        try {
            const logs = await loggerService.getLogs(undefined, undefined, 100);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorLogs = (logs as any[]).filter((l: any) => l.level === 'error');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const warningLogs = (logs as any[]).filter((l: any) => l.level === 'warning');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const successLogs = (logs as any[]).filter((l: any) => l.level === 'success');

            setSummary({
                total: logs.length,
                errors: errorLogs.length,
                warnings: warningLogs.length,
                successCount: successLogs.length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lastError: (errorLogs[0] as any)?.message,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lastErrorTime: (errorLogs[0] as any)?.created_at,
            });
        } catch (err) {
            console.error('Failed to fetch logs summary:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchLogsSummary();
        const interval = setInterval(fetchLogsSummary, 30000); // Atualiza a cada 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Resumo de Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4 text-muted-foreground">
                        Carregando...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Resumo de Logs</CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/logs')}
                    className="gap-1"
                >
                    Ver Todos
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Resumo Rápido */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-red-50">
                        <p className="text-lg font-bold text-red-700">{summary.errors}</p>
                        <p className="text-xs text-red-600">Erros</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-yellow-50">
                        <p className="text-lg font-bold text-yellow-700">{summary.warnings}</p>
                        <p className="text-xs text-yellow-600">Avisos</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-green-50">
                        <p className="text-lg font-bold text-green-700">{summary.successCount}</p>
                        <p className="text-xs text-green-600">Sucessos</p>
                    </div>
                </div>

                {/* Status Geral */}
                <div className="pt-2 border-t">
                    {summary.errors === 0 ? (
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 font-medium">Tudo operacional</span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-red-700 font-medium">{summary.errors} erro(s) detectado(s)</p>
                                {summary.lastError && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {summary.lastError}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <span className="text-muted-foreground">Total: {summary.total} eventos</span>
                    <Badge variant="outline" className="text-xs">Último 100</Badge>
                </div>
            </CardContent>
        </Card>
    );
}
