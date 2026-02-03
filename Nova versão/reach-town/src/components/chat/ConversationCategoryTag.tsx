import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Folder, Tags, X, AlertCircle } from 'lucide-react';

interface Category {
  id: string;
  nome: string;
}

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface ConversationTag {
  tag_id: string;
  conversation_tags: Tag;
}

interface Props {
  conversationId: string;
  secretariaId: string | null;
  currentCategoryId: string | null;
  currentPrioridade: string;
  onUpdate: () => void;
}

const prioridadeColors = {
  baixa: '#22c55e',
  media: '#3b82f6',
  alta: '#f97316',
  urgente: '#ef4444',
};

const prioridadeLabels = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export default function ConversationCategoryTag({
  conversationId,
  secretariaId,
  currentCategoryId,
  currentPrioridade,
  onUpdate,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<ConversationTag[]>([]);
  const { toast } = useToast();

  const loadCategories = async () => {
    const query = supabase
      .from('conversation_categories')
      .select('id, nome')
      .order('nome');

    if (secretariaId) {
      query.or(`secretaria_id.eq.${secretariaId},secretaria_id.is.null`);
    }

    const { data } = await query;
    setCategories(data || []);
  };

  const loadTags = async () => {
    const query = supabase
      .from('conversation_tags')
      .select('id, nome, cor')
      .order('nome');

    if (secretariaId) {
      query.or(`secretaria_id.eq.${secretariaId},secretaria_id.is.null`);
    }

    const { data } = await query;
    setTags(data || []);
  };

  const loadSelectedTags = async () => {
    const { data } = await supabase
      .from('whatsapp_conversation_tag_relations')
      .select('tag_id, conversation_tags(id, nome, cor)')
      .eq('conversation_id', conversationId);

    setSelectedTags(data || []);
  };

  useEffect(() => {
    if (conversationId) {
      loadCategories();
      loadTags();
      loadSelectedTags();
    }
  }, [conversationId, secretariaId]);

  const handleCategoryChange = async (categoryId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ category_id: categoryId === 'none' ? null : categoryId })
      .eq('id', conversationId);

    if (error) {
      toast({
        title: 'Erro ao atualizar categoria',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Categoria atualizada' });
    onUpdate();
  };

  const handleAddTag = async (tagId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversation_tag_relations')
      .insert([{ conversation_id: conversationId, tag_id: tagId }]);

    if (error) {
      toast({
        title: 'Erro ao adicionar tag',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    loadSelectedTags();
    onUpdate();
  };

  const handleRemoveTag = async (tagId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversation_tag_relations')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('tag_id', tagId);

    if (error) {
      toast({
        title: 'Erro ao remover tag',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    loadSelectedTags();
    onUpdate();
  };

  const handlePrioridadeChange = async (prioridade: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ prioridade })
      .eq('id', conversationId);

    if (error) {
      toast({
        title: 'Erro ao atualizar prioridade',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Prioridade atualizada' });
    onUpdate();
  };

  const availableTags = tags.filter(
    (tag) => !selectedTags.some((st) => st.tag_id === tag.id)
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            Prioridade
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <Label>Prioridade da Conversa</Label>
            <Select value={currentPrioridade} onValueChange={handlePrioridadeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(prioridadeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: prioridadeColors[key as keyof typeof prioridadeColors] }}
                      />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      {/* <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Folder className="h-4 w-4 mr-2" />
            Categoria
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <Label>Categoria da Conversa</Label>
            <Select value={currentCategoryId || 'none'} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma categoria</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover> */}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Tags className="h-4 w-4 mr-2" />
            Tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <Label>Tags da Conversa</Label>
            
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((st) => (
                <Badge
                  key={st.tag_id}
                  style={{ backgroundColor: st.conversation_tags.cor, color: '#fff' }}
                  className="flex items-center gap-1"
                >
                  {st.conversation_tags.nome}
                  <button
                    onClick={() => handleRemoveTag(st.tag_id)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {availableTags.length > 0 && (
              <>
                <Label className="text-xs text-muted-foreground">Adicionar tag</Label>
                <Select onValueChange={handleAddTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.cor }}
                          />
                          {tag.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedTags.map((st) => (
        <Badge
          key={st.tag_id}
          style={{ backgroundColor: st.conversation_tags.cor, color: '#fff' }}
          className="flex items-center gap-1"
        >
          {st.conversation_tags.nome}
          <button
            onClick={() => handleRemoveTag(st.tag_id)}
            className="ml-1 hover:bg-white/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
