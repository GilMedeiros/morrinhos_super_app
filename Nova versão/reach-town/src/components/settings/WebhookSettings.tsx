import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function WebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webhookId, setWebhookId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const incomingWebhookUrl = 'https://jxnopzcqptdzzdwxploc.supabase.co/functions/v1/receive-webhook';

  useEffect(() => {
    loadWebhookSettings();
  }, []);

  const loadWebhookSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setWebhookUrl(data.webhook_url);
        setEnabled(data.enabled);
        setWebhookId(data.id);
      }
    } catch (error) {
      console.error('Error loading webhook settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações do webhook',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira uma URL válida',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (webhookId) {
        // Update existing
        const { error } = await supabase
          .from('webhook_settings')
          .update({
            webhook_url: webhookUrl,
            enabled: enabled,
          })
          .eq('id', webhookId);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('webhook_settings')
          .insert({
            webhook_url: webhookUrl,
            enabled: enabled,
          })
          .select()
          .single();

        if (error) throw error;
        setWebhookId(data.id);
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações do webhook salvas',
      });
    } catch (error) {
      console.error('Error saving webhook settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações do webhook',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(incomingWebhookUrl);
    setCopied(true);
    toast({
      title: 'Copiado!',
      description: 'URL copiada para a área de transferência',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Webhook</CardTitle>
          <CardDescription>
            Configure webhooks para integração bidirecional
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhook de Entrada (Receber Mensagens) */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook de Entrada</CardTitle>
          <CardDescription>
            URL para seu serviço externo enviar mensagens dos cidadãos para o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook (use esta URL no seu serviço)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={incomingWebhookUrl}
                className="font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCopyUrl}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure esta URL no seu serviço de WhatsApp para receber mensagens dos cidadãos
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Como enviar dados</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Faça uma requisição POST para a URL acima com o seguinte formato:
            </p>
            <pre className="text-xs bg-background p-2 rounded overflow-auto">
{`{
  "phoneNumber": "5562999999999",
  "contactName": "Nome do Cidadão",
  "messageContent": "Texto da mensagem",
  "timestamp": "2024-01-20T10:30:00Z" (opcional)
}`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              O sistema criará automaticamente uma conversa se não existir e adicionará a mensagem.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Webhook de Saída (Enviar Mensagens) */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook de Saída</CardTitle>
          <CardDescription>
            Configure um webhook para receber mensagens enviadas pelos atendentes no chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL do Webhook</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://seu-webhook.com/endpoint"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            As mensagens serão enviadas via POST com todas as informações da conversa
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="webhook-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="webhook-enabled">Webhook Ativo</Label>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Formato dos Dados Recebidos</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Seu webhook receberá uma requisição POST com os seguintes dados:
          </p>
          <pre className="text-xs bg-background p-2 rounded overflow-auto">
{`{
  "conversationId": "uuid",
  "messageContent": "texto da mensagem",
  "phoneNumber": "número do contato",
  "contactName": "nome do contato",
  "sentBy": "uuid do usuário",
  "sentByName": "nome do atendente",
  "timestamp": "ISO 8601 datetime",
  "source": "conectawa_chat"
}`}
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Use estes dados para enviar a mensagem ao WhatsApp do cidadão através do seu serviço.
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
