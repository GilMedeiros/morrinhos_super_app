import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin_geral' | 'admin_secretaria' | 'atendente';

interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
  secretaria_id: string | null;
  created_at: string;
}

export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as UserRoleData[];
    },
    enabled: !!user,
  });
}

export function useIsAdmin() {
  const { data: roles } = useUserRoles();
  return roles?.some(role => role.role === 'admin_geral') ?? false;
}