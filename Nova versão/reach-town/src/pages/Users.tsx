import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Shield, Building2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useUserRoles';
import CreateUserDialog from '@/components/users/CreateUserDialog';
import ManageRolesDialog from '@/components/users/ManageRolesDialog';
import { useToast } from '@/hooks/use-toast';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: Array<{
    id: string;
    role: 'admin_geral' | 'admin_secretaria' | 'atendente';
    secretaria_id: string | null;
    secretarias?: {
      nome: string;
    } | null;
  }>;
}

export default function Users() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageRolesDialogOpen, setManageRolesDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const isAdmin = useIsAdmin();
  const { toast } = useToast();

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then get roles for each user
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select(`
              id,
              role,
              secretaria_id,
              secretarias:secretaria_id (nome)
            `)
            .eq('user_id', profile.id);

          return {
            ...profile,
            roles: roles || [],
          };
        })
      );

      return usersWithRoles;
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin_geral':
        return 'destructive';
      case 'admin_secretaria':
        return 'default';
      case 'atendente':
        return 'secondary';
      default:
        return 'outline';
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

  const handleManageRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setManageRolesDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta página.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h2>
            <p className="text-muted-foreground">
              Gerencie usuários, roles e permissões do sistema
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : users && users.length > 0 ? (
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {user.full_name || user.email}
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageRoles(user)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Gerenciar Roles
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {user.roles.length > 0 ? (
                    <div className="space-y-3">
                      {user.roles.map((roleData) => (
                        <div
                          key={roleData.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={getRoleBadgeVariant(roleData.role)}>
                              {getRoleLabel(roleData.role)}
                            </Badge>
                            {roleData.secretarias && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                {roleData.secretarias.nome}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma role atribuída
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum usuário cadastrado ainda.
            </CardContent>
          </Card>
        )}
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />

      {selectedUser && (
        <ManageRolesDialog
          open={manageRolesDialogOpen}
          onOpenChange={setManageRolesDialogOpen}
          user={selectedUser}
          onSuccess={refetch}
        />
      )}
    </Layout>
  );
}