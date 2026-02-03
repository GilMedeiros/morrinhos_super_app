import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Folder, Plus, Pencil, Trash2 } from 'lucide-react';
interface Category {
  id: string;
  nome: string;
  descricao: string | null;
  secretaria_id: string | null;
  secretarias?: { nome: string };
}

export default function ManageCategoriesDialog() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [secretarias, setSecretarias] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    secretaria_id: '',
  });
  const { toast } = useToast();

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('conversation_categories')
      .select('*, secretarias:secretaria_id(nome)')
      .order('nome');

    if (error) {
      toast({
        title: 'Erro ao carregar categorias',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setCategories(data || []);
  };

  const loadSecretarias = async () => {
    const { data } = await supabase
      .from('secretarias')
      .select('*')
      .order('nome');
    setSecretarias(data || []);
  };

  useEffect(() => {
    if (open) {
      loadCategories();
      loadSecretarias();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da categoria é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    const categoryData = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      secretaria_id: formData.secretaria_id || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('conversation_categories')
        .update(categoryData)
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Erro ao atualizar categoria',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Categoria atualizada com sucesso' });
    } else {
      const { error } = await supabase
        .from('conversation_categories')
        .insert([categoryData]);

      if (error) {
        toast({
          title: 'Erro ao criar categoria',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Categoria criada com sucesso' });
    }

    setFormData({ nome: '', descricao: '', secretaria_id: '' });
    setEditingId(null);
    loadCategories();
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      nome: category.nome,
      descricao: category.descricao || '',
      secretaria_id: category.secretaria_id || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    const { error } = await supabase
      .from('conversation_categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir categoria',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Categoria excluída com sucesso' });
    loadCategories();
  };

  const handleCancel = () => {
    setFormData({ nome: '', descricao: '', secretaria_id: '' });
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Folder className="h-4 w-4 mr-2" />
          Gerenciar Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias de Conversas</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Categoria</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Iluminação Pública"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descrição da categoria"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="secretaria">Secretaria (opcional)</Label>
                <Select
                  value={formData.secretaria_id || "all"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, secretaria_id: value === "all" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma secretaria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as secretarias</SelectItem>
                    {secretarias.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div>
            <Label>Categorias Existentes</Label>
            <ScrollArea className="h-[400px] mt-2 border rounded-md p-2">
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{category.nome}</div>
                      {category.descricao && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {category.descricao}
                        </div>
                      )}
                      {category.secretarias && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {category.secretarias.nome}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
