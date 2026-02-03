import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loggerService, LogLevel } from '@/services/loggerService';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Bug, RefreshCw, Trash2 } from 'lucide-react';

interface LogDisplay {
    id: string;
    level: LogLevel;
    module: string;
    message: string;
    details?: string;
    created_at: string;
}

export default function Logs() {
    const [logs, setLogs] = useState<LogDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<LogLevel | ''>('');
    const [modules, setModules] = useState<string[]>([]);

    async function fetchLogs() {
        setLoading(true);
        try {
            const fetchedLogs = await loggerService.getLogs(
                selectedModule || undefined,
                (selectedLevel as LogLevel) || undefined,
                200
            );

            const displayLogs = (fetchedLogs as LogDisplay[]).map((log, idx) => ({
                ...log,
                id: `${log.created_at}_${idx}`,
            }));

            setLogs(displayLogs);

            // Extract unique modules
            const uniqueModules = Array.from(new Set(displayLogs.map(l => l.module)));
            setModules(uniqueModules as string[]);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedModule, selectedLevel]);

    function getLevelIcon(level: LogLevel) {
        switch (level) {
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'debug':
                return <Bug className="w-4 h-4 text-gray-500" />;
            default:
                return <Info className="w-4 h-4 text-blue-500" />;
        }
    }

    function getLevelColor(level: LogLevel) {
        switch (level) {
            case 'error':
                return 'bg-red-50 text-red-700 hover:bg-red-100';
            case 'warning':
                return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
            case 'success':
                return 'bg-green-50 text-green-700 hover:bg-green-100';
            case 'debug':
                return 'bg-gray-50 text-gray-700 hover:bg-gray-100';
            default:
                return 'bg-blue-50 text-blue-700 hover:bg-blue-100';
        }
    }

    function formatDate(dateString: string) {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    }

    return (
        <Layout>
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold">Logs da Aplicação</h1>
                    <p className="text-muted-foreground mt-2">
                        Visualize todos os eventos e erros do sistema
                    </p>
                </div>

                {/* Filtros */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Filtros</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Módulo</label>
                                <select
                                    value={selectedModule}
                                    onChange={e => setSelectedModule(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">Todos os módulos</option>
                                    {modules.map(m => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Nível</label>
                                <select
                                    value={selectedLevel}
                                    onChange={e => setSelectedLevel(e.target.value as LogLevel | '')}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">Todos os níveis</option>
                                    <option value="error">Erro</option>
                                    <option value="warning">Aviso</option>
                                    <option value="success">Sucesso</option>
                                    <option value="info">Info</option>
                                    <option value="debug">Debug</option>
                                </select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    onClick={fetchLogs}
                                    variant="outline"
                                    className="w-full"
                                    disabled={loading}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    {loading ? 'Carregando...' : 'Atualizar'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabela de Logs */}
                <Card>
                    <CardContent className="p-0 overflow-x-auto">
                        {loading ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Carregando logs...
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Nenhum log encontrado.
                            </div>
                        ) : (
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-border bg-accent/30">
                                        <th className="px-6 py-4 text-left font-medium text-sm">Data/Hora</th>
                                        <th className="px-6 py-4 text-left font-medium text-sm">Módulo</th>
                                        <th className="px-6 py-4 text-left font-medium text-sm">Nível</th>
                                        <th className="px-6 py-4 text-left font-medium text-sm">Mensagem</th>
                                        <th className="px-6 py-4 text-left font-medium text-sm">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-border hover:bg-accent/20 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                <Badge variant="outline">{log.module}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    {getLevelIcon(log.level)}
                                                    <Badge className={getLevelColor(log.level)} variant="outline">
                                                        {log.level.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm max-w-xs truncate">
                                                {log.message}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {log.details && (
                                                    <details className="cursor-pointer">
                                                        <summary className="text-blue-600 hover:underline">
                                                            Ver detalhes
                                                        </summary>
                                                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded border overflow-x-auto max-w-md">
                                                            {JSON.stringify(JSON.parse(log.details), null, 2)}
                                                        </pre>
                                                    </details>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {['error', 'warning', 'success', 'info', 'debug'].map(level => {
                        const count = logs.filter(l => l.level === level).length;
                        return (
                            <Card key={level}>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">
                                            {count}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                                            {level === 'error' ? 'Erros' : level === 'warning' ? 'Avisos' : level === 'success' ? 'Sucessos' : level === 'info' ? 'Informações' : 'Debug'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}
