import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateTicketFromChatDialogProps {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Secretaria {
  id: string;
  nome: string;
}

export default function CreateTicketFromChatDialog({
  conversationId,
  open,
  onOpenChange,
}: CreateTicketFromChatDialogProps) {
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [secretariaId, setSecretariaId] = useState('');
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [conversationData, setConversationData] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      // Load secretarias
      const { data: secData } = await supabase
        .from('secretarias')
        .select('id, nome')
        .order('nome');
      
      if (secData) setSecretarias(secData);

      // Load conversation data
      const { data: convData } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convData) {
        setConversationData(convData);
        if (convData.secretaria_id) {
          setSecretariaId(convData.secretaria_id);
        }
      }
    };

    if (open) loadData();
  }, [open, conversationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !secretariaId) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Generate ticket number
      const { data: numeroData, error: numeroError } = await supabase
        .rpc('generate_ticket_number');

      if (numeroError) throw numeroError;

      const { error } = await supabase.from('tickets').insert({
        numero: numeroData,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        prioridade,
        secretaria_id: secretariaId,
        criado_por: user?.id,
        nome_cidadao: conversationData?.contact_name,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Ticket criado com sucesso',
      });

      onOpenChange(false);
      setTitulo('');
      setDescricao('');
      setPrioridade('media');
      setSecretariaId('');
    } catch (error: any) {
      toast({
        title: 'Erro ao criar ticket',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Ticket da Conversa</DialogTitle>
          <DialogDescription>
            Criar um ticket baseado nesta conversa do WhatsApp
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {conversationData && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">
                Contato: {conversationData.contact_name || conversationData.phone_number}
              </p>
              <p className="text-muted-foreground">
                {conversationData.phone_number}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do ticket"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o problema ou solicitação"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secretaria">Secretaria *</Label>
              <Select value={secretariaId} onValueChange={setSecretariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {secretarias.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
