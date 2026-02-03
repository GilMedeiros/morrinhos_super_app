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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Tag {
  id: string;
  nome: string;
  cor: string;
  secretaria_id: string | null;
  secretarias?: { nome: string };
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

export default function ManageTagsDialog() {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [secretarias, setSecretarias] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cor: '#3b82f6',
    secretaria_id: '',
  });
  const { toast } = useToast();

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('conversation_tags')
      .select('*, secretarias:secretaria_id(nome)')
      .order('nome');

    if (error) {
      toast({
        title: 'Erro ao carregar tags',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setTags(data || []);
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
      loadTags();
      loadSecretarias();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da tag é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    const tagData = {
      nome: formData.nome.trim(),
      cor: formData.cor,
      secretaria_id: formData.secretaria_id || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('conversation_tags')
        .update(tagData)
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Erro ao atualizar tag',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Tag atualizada com sucesso' });
    } else {
      const { error } = await supabase
        .from('conversation_tags')
        .insert([tagData]);

      if (error) {
        toast({
          title: 'Erro ao criar tag',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Tag criada com sucesso' });
    }

    setFormData({ nome: '', cor: '#3b82f6', secretaria_id: '' });
    setEditingId(null);
    loadTags();
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setFormData({
      nome: tag.nome,
      cor: tag.cor,
      secretaria_id: tag.secretaria_id || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tag?')) return;

    const { error } = await supabase
      .from('conversation_tags')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir tag',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Tag excluída com sucesso' });
    loadTags();
  };

  const handleCancel = () => {
    setFormData({ nome: '', cor: '#3b82f6', secretaria_id: '' });
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tags className="h-4 w-4 mr-2" />
          Gerenciar Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags de Conversas</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Tag</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Urgente"
                />
              </div>

              <div>
                <Label>Cor da Tag</Label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: formData.cor === color ? '#000' : 'transparent',
                      }}
                      onClick={() => setFormData({ ...formData, cor: color })}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.cor}
                  onChange={(e) =>
                    setFormData({ ...formData, cor: e.target.value })
                  }
                  className="mt-2 h-10"
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
            <Label>Tags Existentes</Label>
            <ScrollArea className="h-[400px] mt-2 border rounded-md p-2">
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Badge style={{ backgroundColor: tag.cor, color: '#fff' }}>
                        {tag.nome}
                      </Badge>
                      {tag.secretarias && (
                        <span className="text-xs text-muted-foreground">
                          {tag.secretarias.nome}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tag)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tag.id)}
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
