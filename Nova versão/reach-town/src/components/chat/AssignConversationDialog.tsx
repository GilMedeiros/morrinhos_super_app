import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus } from 'lucide-react';

interface AssignConversationDialogProps {
  conversationId: string;
  currentSecretariaId: string | null;
  onAssigned: () => void;
}

interface Atendente {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Secretaria {
  id: string;
  nome: string;
}

export default function AssignConversationDialog({
  conversationId,
  currentSecretariaId,
  onAssigned,
}: AssignConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [assignType, setAssignType] = useState<'atendente' | 'secretaria'>('atendente');
  const [selectedAtendente, setSelectedAtendente] = useState('');
  const [selectedSecretaria, setSelectedSecretaria] = useState('');
  const [motivo, setMotivo] = useState('');
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, currentSecretariaId]);

  const loadData = async () => {
    // Carregar atendentes da secretaria atual
    if (currentSecretariaId) {
      const { data: atendentesData } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          profiles:user_id(full_name, email)
        `)
        .eq('secretaria_id', currentSecretariaId)
        .eq('role', 'atendente');

      if (atendentesData) {
        setAtendentes(atendentesData as any);
      }
    }

    // Carregar todas as secretarias
    const { data: secretariasData } = await supabase
      .from('secretarias')
      .select('id, nome')
      .order('nome');

    if (secretariasData) {
      setSecretarias(secretariasData);
    }
  };

  const handleAssign = async () => {
    if (!motivo.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o motivo da transferência',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (assignType === 'atendente') {
        if (!selectedAtendente) {
          toast({
            title: 'Erro',
            description: 'Selecione um atendente',
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('whatsapp_conversations')
          .update({
            atribuido_para: selectedAtendente,
            status: 'em_atendimento',
          })
          .eq('id', conversationId);

        if (error) throw error;

        // Register transfer
        await supabase.from('whatsapp_conversation_transfers').insert({
          conversation_id: conversationId,
          from_secretaria_id: currentSecretariaId,
          to_secretaria_id: currentSecretariaId,
          from_user_id: user?.id,
          to_user_id: selectedAtendente,
          motivo: motivo.trim(),
        });

        toast({
          title: 'Conversa atribuída',
          description: 'A conversa foi atribuída ao atendente selecionado',
        });
      } else {
        if (!selectedSecretaria) {
          toast({
            title: 'Erro',
            description: 'Selecione uma secretaria',
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('whatsapp_conversations')
          .update({
            secretaria_id: selectedSecretaria,
            atribuido_para: null,
            status: 'aberto',
          })
          .eq('id', conversationId);

        if (error) throw error;

        // Register transfer
        await supabase.from('whatsapp_conversation_transfers').insert({
          conversation_id: conversationId,
          from_secretaria_id: currentSecretariaId,
          to_secretaria_id: selectedSecretaria,
          from_user_id: user?.id,
          to_user_id: null,
          motivo: motivo.trim(),
        });

        toast({
          title: 'Conversa transferida',
          description: 'A conversa foi transferida para a secretaria selecionada',
        });
      }

      setOpen(false);
      onAssigned();
      setSelectedAtendente('');
      setSelectedSecretaria('');
      setMotivo('');
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir conversa',
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
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Transferir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Conversa</DialogTitle>
          <DialogDescription>
            Atribua esta conversa a um atendente ou transfira para outra secretaria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={assignType} onValueChange={(value) => setAssignType(value as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="atendente" id="atendente" />
              <Label htmlFor="atendente">Atribuir a atendente da secretaria</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="secretaria" id="secretaria" />
              <Label htmlFor="secretaria">Transferir para outra secretaria</Label>
            </div>
          </RadioGroup>

          {assignType === 'atendente' ? (
            <div className="space-y-2">
              <Label htmlFor="atendente-select">Atendente</Label>
              <Select value={selectedAtendente} onValueChange={setSelectedAtendente}>
                <SelectTrigger id="atendente-select">
                  <SelectValue placeholder="Selecione um atendente" />
                </SelectTrigger>
                <SelectContent>
                  {atendentes.map((atendente) => (
                    <SelectItem key={atendente.user_id} value={atendente.user_id}>
                      {atendente.profiles.full_name} ({atendente.profiles.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="secretaria-select">Secretaria</Label>
              <Select value={selectedSecretaria} onValueChange={setSelectedSecretaria}>
                <SelectTrigger id="secretaria-select">
                  <SelectValue placeholder="Selecione uma secretaria" />
                </SelectTrigger>
                <SelectContent>
                  {secretarias
                    .filter((s) => s.id !== currentSecretariaId)
                    .map((secretaria) => (
                      <SelectItem key={secretaria.id} value={secretaria.id}>
                        {secretaria.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo da transferência <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da transferência..."
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {motivo.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
