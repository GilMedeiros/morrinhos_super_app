import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FilterValues {
  status: string;
  prioridade: string;
  secretaria_id: string;
  atribuido_para: string;
  tag_ids: string[];
}

interface ConversationFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
}

export default function ConversationFilters({ onFilterChange }: ConversationFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    status: '',
    prioridade: '',
    secretaria_id: '',
    atribuido_para: '',
    tag_ids: [],
  });
  const [secretarias, setSecretarias] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    loadSecretarias();
    loadUsers();
    loadTags();
  }, []);

  const loadSecretarias = async () => {
    const { data } = await supabase
      .from('secretarias')
      .select('id, nome')
      .order('nome');
    setSecretarias(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    setUsers(data || []);
  };

  const loadTags = async () => {
    const { data } = await supabase
      .from('conversation_tags')
      .select('id, nome, cor')
      .order('nome');
    setTags(data || []);
  };

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleTagToggle = (tagId: string) => {
    const newTagIds = filters.tag_ids.includes(tagId)
      ? filters.tag_ids.filter(id => id !== tagId)
      : [...filters.tag_ids, tagId];
    handleFilterChange('tag_ids', newTagIds);
  };

  const clearFilters = () => {
    const emptyFilters: FilterValues = {
      status: '',
      prioridade: '',
      secretaria_id: '',
      atribuido_para: '',
      tag_ids: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'tag_ids') return (value as string[]).length > 0;
    return value !== '';
  });

  const selectedTags = tags.filter(tag => filters.tag_ids.includes(tag.id));

  return (
    <div className="flex items-center gap-2 mb-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {Object.values(filters).flat().filter(v => v).length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filtros</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select
                  value={filters.prioridade || "all"}
                  onValueChange={(value) => handleFilterChange('prioridade', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Secretaria</Label>
                <Select
                  value={filters.secretaria_id || "all"}
                  onValueChange={(value) => handleFilterChange('secretaria_id', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {secretarias.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Atendente</Label>
                <Select
                  value={filters.atribuido_para || "all"}
                  onValueChange={(value) => handleFilterChange('atribuido_para', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{
                        backgroundColor: filters.tag_ids.includes(tag.id) ? tag.cor : 'transparent',
                        color: filters.tag_ids.includes(tag.id) ? '#fff' : tag.cor,
                        borderColor: tag.cor,
                      }}
                      className="cursor-pointer border-2"
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.cor, color: '#fff' }}
          className="flex items-center gap-1"
        >
          {tag.nome}
          <button
            onClick={() => handleTagToggle(tag.id)}
            className="hover:bg-white/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.status && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Status: {filters.status}
          <button
            onClick={() => handleFilterChange('status', '')}
            className="hover:bg-accent rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.prioridade && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Prioridade: {filters.prioridade}
          <button
            onClick={() => handleFilterChange('prioridade', '')}
            className="hover:bg-accent rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
