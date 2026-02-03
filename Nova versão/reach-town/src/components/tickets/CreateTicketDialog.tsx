import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateTicketDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTicketDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [secretariaId, setSecretariaId] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [cpfCidadao, setCpfCidadao] = useState('');
  const [nomeCidadao, setNomeCidadao] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { data: secretarias } = useQuery({
    queryKey: ['secretarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secretarias')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretariaId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma secretaria',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Get ticket number
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_ticket_number');

      if (numberError) throw numberError;

      // Create ticket
      const { error } = await supabase.from('tickets').insert({
        numero: numberData,
        titulo,
        descricao: descricao || null,
        secretaria_id: secretariaId,
        prioridade,
        status: 'aberto',
        cpf_cidadao: cpfCidadao || null,
        nome_cidadao: nomeCidadao || null,
        criado_por: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Ticket criado',
        description: `Ticket ${numberData} foi criado com sucesso.`,
      });

      setTitulo('');
      setDescricao('');
      setSecretariaId('');
      setPrioridade('media');
      setCpfCidadao('');
      setNomeCidadao('');
      onOpenChange(false);
      onSuccess();
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Ticket</DialogTitle>
          <DialogDescription>
            Crie um novo ticket de atendimento
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Descreva brevemente o problema"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Forneça mais detalhes sobre o problema..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretaria">Secretaria *</Label>
            <Select value={secretariaId} onValueChange={setSecretariaId}>
              <SelectTrigger id="secretaria">
                <SelectValue placeholder="Selecione uma secretaria" />
              </SelectTrigger>
              <SelectContent>
                {secretarias?.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prioridade">Prioridade *</Label>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger id="prioridade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome_cidadao">Nome do Cidadão</Label>
            <Input
              id="nome_cidadao"
              value={nomeCidadao}
              onChange={(e) => setNomeCidadao(e.target.value)}
              placeholder="Digite o nome completo do cidadão"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf_cidadao">CPF do Cidadão</Label>
            <Input
              id="cpf_cidadao"
              value={cpfCidadao}
              onChange={(e) => setCpfCidadao(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
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