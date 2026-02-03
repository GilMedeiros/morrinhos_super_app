import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Megaphone,
  Settings,
  LogOut,
  Building2,
  Users,
  FileText
} from 'lucide-react';
import logoMorrinhos from '@/assets/logo-morrinhos.png';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin_geral', 'admin_secretaria', 'atendente'] },
  { title: 'Secretarias', url: '/secretarias', icon: Building2, roles: ['admin_geral'] },
  { title: 'Usuários', url: '/users', icon: Users, roles: ['admin_geral'] },
  { title: 'Chat WhatsApp', url: '/chat', icon: MessageSquare, roles: ['admin_geral', 'admin_secretaria', 'atendente'] },
  { title: 'Tickets', url: '/tickets', icon: Ticket, roles: ['admin_geral', 'admin_secretaria', 'atendente'] },
  { title: 'Campanhas', url: '/campaigns', icon: Megaphone, roles: ['admin_geral', 'admin_secretaria', 'atendente'] },
  { title: 'Logs', url: '/logs', icon: FileText, roles: ['admin_geral'] },
  { title: 'Configurações', url: '/settings', icon: Settings, roles: ['admin_geral'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { settings } = useSystemSettings();
  const { data: userRoles } = useUserRoles();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50';

  const logoUrl = settings.logo_url || logoMorrinhos;

  // Filter menu items based on user roles
  const visibleMenuItems = menuItems.filter(item => {
    if (!userRoles || userRoles.length === 0) return false;
    return userRoles.some(userRole => item.roles.includes(userRole.role));
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain flex-shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{settings.app_name || 'Prefeitura'}</span>
              <span className="text-xs text-muted-foreground">{settings.app_subtitle || 'Morrinhos'}</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 border-t">
          {!collapsed && user && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start"
            size={collapsed ? 'icon' : 'default'}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}