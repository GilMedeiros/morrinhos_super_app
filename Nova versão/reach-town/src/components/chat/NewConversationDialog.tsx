import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';

interface NewConversationDialogProps {
  onConversationCreated: () => void;
}

interface Secretaria {
  id: string;
  nome: string;
}

export default function NewConversationDialog({
  onConversationCreated,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [secretariaId, setSecretariaId] = useState('');
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadSecretarias = async () => {
      const { data } = await supabase
        .from('secretarias')
        .select('id, nome')
        .order('nome');
      
      if (data) setSecretarias(data);
    };

    if (open) loadSecretarias();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast({
        title: 'Erro',
        description: 'O número de telefone é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('whatsapp_conversations').insert({
        phone_number: phoneNumber.trim(),
        contact_name: contactName.trim() || null,
        secretaria_id: secretariaId || null,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conversa criada com sucesso',
      });

      setOpen(false);
      setPhoneNumber('');
      setContactName('');
      setSecretariaId('');
      onConversationCreated();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conversa',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>
            Crie uma nova conversa no WhatsApp
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de Telefone *</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Contato</Label>
            <Input
              id="name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nome do cidadão"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretaria">Secretaria</Label>
            <Select value={secretariaId} onValueChange={setSecretariaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma secretaria" />
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Conversa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
