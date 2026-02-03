import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface Secretaria {
  id: string;
  nome: string;
  descricao: string | null;
}

interface DeleteSecretariaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretaria: Secretaria;
  onSuccess: () => void;
}

export default function DeleteSecretariaDialog({
  open,
  onOpenChange,
  secretaria,
  onSuccess,
}: DeleteSecretariaDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('secretarias')
        .delete()
        .eq('id', secretaria.id);

      if (error) throw error;

      toast({
        title: 'Secretaria excluída',
        description: `${secretaria.nome} foi removida do sistema.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir secretaria',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Excluir Secretaria</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="pt-3">
            Tem certeza que deseja excluir <strong>{secretaria.nome}</strong>?
            <br />
            <br />
            Esta ação não pode ser desfeita. Todos os dados relacionados a esta
            secretaria serão removidos, incluindo vínculos com usuários e tickets.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir Secretaria'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}