import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';

interface Secretaria {
  id: string;
  nome: string;
  descricao: string | null;
}

interface EditSecretariaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretaria: Secretaria;
  onSuccess: () => void;
}

export default function EditSecretariaDialog({
  open,
  onOpenChange,
  secretaria,
  onSuccess,
}: EditSecretariaDialogProps) {
  const [nome, setNome] = useState(secretaria.nome);
  const [descricao, setDescricao] = useState(secretaria.descricao || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setNome(secretaria.nome);
    setDescricao(secretaria.descricao || '');
  }, [secretaria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('secretarias')
        .update({
          nome,
          descricao: descricao || null,
        })
        .eq('id', secretaria.id);

      if (error) throw error;

      toast({
        title: 'Secretaria atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar secretaria',
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
          <DialogTitle>Editar Secretaria</DialogTitle>
          <DialogDescription>
            Atualize as informações da secretaria
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Secretaria *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Secretaria de Educação"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva as responsabilidades da secretaria..."
              rows={4}
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}