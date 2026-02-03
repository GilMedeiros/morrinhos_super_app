import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useAuth } from '@/hooks/useAuth';
import { Trash2, Edit, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageTemplate {
  id: string;
  secretaria_id: string;
  titulo: string;
  conteudo: string;
  secretarias?: {
    nome: string;
  };
}

interface Secretaria {
  id: string;
  nome: string;
}

interface MessageTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MessageTemplatesDialog({
  open,
  onOpenChange,
}: MessageTemplatesDialogProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    secretaria_id: '',
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select(`
          *,
          secretarias:secretaria_id(nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadSecretarias = async () => {
    try {
      const { data, error } = await supabase
        .from('secretarias')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setSecretarias(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar secretarias',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadSecretarias();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo.trim() || !formData.conteudo.trim() || !formData.secretaria_id) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('message_templates')
          .update({
            titulo: formData.titulo.trim(),
            conteudo: formData.conteudo.trim(),
            secretaria_id: formData.secretaria_id,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: 'Template atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('message_templates')
          .insert({
            titulo: formData.titulo.trim(),
            conteudo: formData.conteudo.trim(),
            secretaria_id: formData.secretaria_id,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: 'Template criado com sucesso!' });
      }

      setFormData({ titulo: '', conteudo: '', secretaria_id: '' });
      setEditingTemplate(null);
      loadTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar template',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      titulo: template.titulo,
      conteudo: template.conteudo,
      secretaria_id: template.secretaria_id,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Template excluído com sucesso!' });
      loadTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir template',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setFormData({ titulo: '', conteudo: '', secretaria_id: '' });
    setEditingTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gerenciar Templates de Mensagem</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="secretaria">Secretaria</Label>
                <Select
                  value={formData.secretaria_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, secretaria_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a secretaria" />
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

              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  placeholder="Ex: Saudação inicial"
                />
              </div>

              <div>
                <Label htmlFor="conteudo">Mensagem</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) =>
                    setFormData({ ...formData, conteudo: e.target.value })
                  }
                  placeholder="Digite o conteúdo da mensagem..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Atualizar' : 'Criar'} Template
                </Button>
                {editingTemplate && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div>
            <Label>Templates Salvos</Label>
            <ScrollArea className="h-[400px] mt-2">
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{template.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.secretarias?.nome}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.conteudo}
                    </p>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum template criado ainda
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
