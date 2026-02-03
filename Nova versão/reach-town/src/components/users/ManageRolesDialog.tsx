import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  roles: Array<{
    id: string;
    role: 'admin_geral' | 'admin_secretaria' | 'atendente';
    secretaria_id: string | null;
    secretarias?: {
      nome: string;
    } | null;
  }>;
}

interface ManageRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles;
  onSuccess: () => void;
}

export default function ManageRolesDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ManageRolesDialogProps) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedSecretaria, setSelectedSecretaria] = useState<string>('');
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

  const handleAddRole = async () => {
    if (!selectedRole) {
      toast({
        title: 'Erro',
        description: 'Selecione uma role',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRole !== 'admin_geral' && !selectedSecretaria) {
      toast({
        title: 'Erro',
        description: 'Selecione uma secretaria',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: user.id,
        role: selectedRole as 'admin_geral' | 'admin_secretaria' | 'atendente',
        secretaria_id: selectedRole === 'admin_geral' ? null : selectedSecretaria || null,
      });

      if (error) throw error;

      toast({
        title: 'Role atribuída',
        description: 'Role adicionada com sucesso.',
      });

      setSelectedRole('');
      setSelectedSecretaria('');
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Role removida',
        description: 'Role removida com sucesso.',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_geral':
        return 'Admin Geral';
      case 'admin_secretaria':
        return 'Admin Secretaria';
      case 'atendente':
        return 'Atendente';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Roles</DialogTitle>
          <DialogDescription>
            Gerencie as roles e permissões de {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Roles */}
          <div className="space-y-3">
            <Label>Roles Atuais</Label>
            {user.roles.length > 0 ? (
              <div className="space-y-2">
                {user.roles.map((roleData) => (
                  <div
                    key={roleData.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{getRoleLabel(roleData.role)}</Badge>
                      {roleData.secretarias && (
                        <span className="text-sm text-muted-foreground">
                          {roleData.secretarias.nome}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRole(roleData.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma role atribuída
              </p>
            )}
          </div>

          {/* Add New Role */}
          <div className="space-y-4 pt-4 border-t">
            <Label>Adicionar Nova Role</Label>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione uma role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_geral">Admin Geral</SelectItem>
                    <SelectItem value="admin_secretaria">Admin Secretaria</SelectItem>
                    <SelectItem value="atendente">Atendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole && selectedRole !== 'admin_geral' && (
                <div className="space-y-2">
                  <Label htmlFor="secretaria">Secretaria</Label>
                  <Select
                    value={selectedSecretaria}
                    onValueChange={setSelectedSecretaria}
                  >
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
              )}

              <Button onClick={handleAddRole} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Role
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}