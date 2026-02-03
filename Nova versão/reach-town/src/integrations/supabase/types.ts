export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversation_categories: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          secretaria_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          secretaria_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          secretaria_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_categories_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          secretaria_id: string | null
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          secretaria_id?: string | null
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          secretaria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tags_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          secretaria_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          secretaria_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          secretaria_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      secretarias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      ticket_transfers: {
        Row: {
          created_at: string
          from_secretaria_id: string
          id: string
          motivo: string | null
          ticket_id: string
          to_secretaria_id: string
          transferido_por: string | null
        }
        Insert: {
          created_at?: string
          from_secretaria_id: string
          id?: string
          motivo?: string | null
          ticket_id: string
          to_secretaria_id: string
          transferido_por?: string | null
        }
        Update: {
          created_at?: string
          from_secretaria_id?: string
          id?: string
          motivo?: string | null
          ticket_id?: string
          to_secretaria_id?: string
          transferido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_transfers_from_secretaria_id_fkey"
            columns: ["from_secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_to_secretaria_id_fkey"
            columns: ["to_secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          atribuido_para: string | null
          cpf_cidadao: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          nome_cidadao: string | null
          numero: string
          prioridade: string
          secretaria_id: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          atribuido_para?: string | null
          cpf_cidadao?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome_cidadao?: string | null
          numero: string
          prioridade?: string
          secretaria_id: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          atribuido_para?: string | null
          cpf_cidadao?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome_cidadao?: string | null
          numero?: string
          prioridade?: string
          secretaria_id?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          secretaria_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          secretaria_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          secretaria_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
      whatsapp_conversation_tag_relations: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_tag_relations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "conversation_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_transfers: {
        Row: {
          conversation_id: string
          created_at: string
          from_secretaria_id: string | null
          from_user_id: string | null
          id: string
          motivo: string
          to_secretaria_id: string | null
          to_user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          from_secretaria_id?: string | null
          from_user_id?: string | null
          id?: string
          motivo: string
          to_secretaria_id?: string | null
          to_user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          from_secretaria_id?: string | null
          from_user_id?: string | null
          id?: string
          motivo?: string
          to_secretaria_id?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_transfers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_transfers_from_secretaria_id_fkey"
            columns: ["from_secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_transfers_to_secretaria_id_fkey"
            columns: ["to_secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          atribuido_para: string | null
          category_id: string | null
          contact_name: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          phone_number: string
          prioridade: string
          secretaria_id: string | null
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          atribuido_para?: string | null
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone_number: string
          prioridade?: string
          secretaria_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          atribuido_para?: string | null
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone_number?: string
          prioridade?: string
          secretaria_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "conversation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_from_customer: boolean
          read_at: string | null
          sent_by: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_from_customer?: boolean
          read_at?: string | null
          sent_by?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_from_customer?: boolean
          read_at?: string | null
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_geral: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      user_secretarias: {
        Args: { _user_id: string }
        Returns: string[]
      }
    }
    Enums: {
      app_role: "admin_geral" | "admin_secretaria" | "atendente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin_geral", "admin_secretaria", "atendente"],
    },
  },
} as const
