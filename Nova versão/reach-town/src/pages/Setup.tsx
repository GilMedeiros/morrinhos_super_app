import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, CheckCircle2 } from 'lucide-react';

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateAdmin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin');

      if (error) throw error;

      setCreated(true);
      toast({
        title: 'Sucesso!',
        description: 'Usuário administrador criado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Configuração Inicial</CardTitle>
          <CardDescription>
            Crie o usuário administrador para começar a usar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!created ? (
            <>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Clique no botão abaixo para criar o usuário administrador inicial.
                </p>
                <div className="p-4 bg-muted rounded-lg space-y-1">
                  <p className="font-medium text-foreground">Credenciais padrão:</p>
                  <p><strong>Email:</strong> admin@sistema.com</p>
                  <p><strong>Senha:</strong> Admin@123</p>
                </div>
                <p className="text-xs">
                  Você poderá alterar essas credenciais após o primeiro login.
                </p>
              </div>
              <Button
                onClick={handleCreateAdmin}
                className="w-full"
                disabled={loading}
                size="lg"
              >
                {loading ? 'Criando...' : 'Criar Administrador'}
              </Button>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="h-16 w-16 text-accent" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Configuração Concluída!</h3>
                <p className="text-sm text-muted-foreground">
                  O administrador foi criado com sucesso. Agora você pode fazer login no sistema.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
                size="lg"
              >
                Ir para Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}