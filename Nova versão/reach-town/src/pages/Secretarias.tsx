import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Pencil, Trash2, Users } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useUserRoles';
import CreateSecretariaDialog from '@/components/secretarias/CreateSecretariaDialog';
import EditSecretariaDialog from '@/components/secretarias/EditSecretariaDialog';
import DeleteSecretariaDialog from '@/components/secretarias/DeleteSecretariaDialog';
import { useToast } from '@/hooks/use-toast';

interface Secretaria {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export default function Secretarias() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSecretaria, setSelectedSecretaria] = useState<Secretaria | null>(null);
  const isAdmin = useIsAdmin();
  const { toast } = useToast();

  const { data: secretarias, isLoading, refetch } = useQuery({
    queryKey: ['secretarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secretarias')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as Secretaria[];
    },
  });

  // Get user count per secretaria
  const { data: userCounts } = useQuery({
    queryKey: ['secretaria-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('secretaria_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((role) => {
        if (role.secretaria_id) {
          counts[role.secretaria_id] = (counts[role.secretaria_id] || 0) + 1;
        }
      });

      return counts;
    },
  });

  const handleEdit = (secretaria: Secretaria) => {
    setSelectedSecretaria(secretaria);
    setEditDialogOpen(true);
  };

  const handleDelete = (secretaria: Secretaria) => {
    setSelectedSecretaria(secretaria);
    setDeleteDialogOpen(true);
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
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Secretarias</h2>
            <p className="text-muted-foreground">
              Gerencie as secretarias do município
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            Nova Secretaria
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : secretarias && secretarias.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {secretarias.map((secretaria) => (
              <Card key={secretaria.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{secretaria.nome}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {userCounts?.[secretaria.id] || 0} usuários
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {secretaria.descricao || 'Sem descrição'}
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(secretaria)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(secretaria)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma secretaria cadastrada</p>
              <p className="text-sm text-muted-foreground mb-4">
                Comece criando sua primeira secretaria
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Building2 className="mr-2 h-4 w-4" />
                Criar Primeira Secretaria
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateSecretariaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />

      {selectedSecretaria && (
        <>
          <EditSecretariaDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            secretaria={selectedSecretaria}
            onSuccess={refetch}
          />
          <DeleteSecretariaDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            secretaria={selectedSecretaria}
            onSuccess={refetch}
          />
        </>
      )}
    </Layout>
  );
}