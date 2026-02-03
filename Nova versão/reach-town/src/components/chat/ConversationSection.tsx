import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, User, Headset } from 'lucide-react';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_from_customer?: boolean;
  unread_count: number;
  status: string;
  prioridade: string;
  secretarias?: {
    nome: string;
  };
}

interface ConversationSectionProps {
  title: string;
  count: number;
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultExpanded?: boolean;
}

const prioridadeColors = {
  baixa: 'border-l-4 border-l-[#22c55e]',
  media: 'border-l-4 border-l-[#3b82f6]',
  alta: 'border-l-4 border-l-[#f97316]',
  urgente: 'border-l-4 border-l-[#ef4444] bg-red-50/50 dark:bg-red-950/20',
};

const prioridadeBadgeColors = {
  baixa: { bg: '#22c55e', text: '#fff' },
  media: { bg: '#3b82f6', text: '#fff' },
  alta: { bg: '#f97316', text: '#fff' },
  urgente: { bg: '#ef4444', text: '#fff' },
};

const prioridadeLabels = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

const statusColors = {
  aberto: 'bg-accent',
  em_atendimento: 'bg-primary',
  fechado: 'bg-muted',
};

const statusLabels = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  fechado: 'Fechado',
};

export default function ConversationSection({
  title,
  count,
  conversations,
  selectedId,
  onSelect,
  defaultExpanded = true,
}: ConversationSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (count === 0) return null;

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-border">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedId === conv.id ? 'bg-accent' : ''
              } ${prioridadeColors[conv.prioridade as keyof typeof prioridadeColors]}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {conv.contact_name || conv.phone_number}
                  </p>
                  {conv.contact_name && (
                    <p className="text-xs text-muted-foreground">
                      {conv.phone_number}
                    </p>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <Badge variant="default" className="ml-2">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>

              {conv.last_message && (
                <div className="flex items-start gap-2 mb-2">
                  {conv.last_message_from_customer ? (
                    <User className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Headset className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                    {conv.last_message}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={statusColors[conv.status as keyof typeof statusColors]}
                  >
                    {statusLabels[conv.status as keyof typeof statusLabels]}
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: prioridadeBadgeColors[conv.prioridade as keyof typeof prioridadeBadgeColors]?.bg,
                      color: prioridadeBadgeColors[conv.prioridade as keyof typeof prioridadeBadgeColors]?.text,
                    }}
                  >
                    {prioridadeLabels[conv.prioridade as keyof typeof prioridadeLabels]}
                  </Badge>
                </div>
                {conv.secretarias && (
                  <span className="text-muted-foreground text-xs">
                    {conv.secretarias.nome}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
