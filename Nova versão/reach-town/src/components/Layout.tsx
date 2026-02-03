import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import NotificationBell from './NotificationBell';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { settings } = useSystemSettings();
  const pageTitle = settings.page_title || 'Sistema de Gestão Municipal';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 bg-card sticky top-0 z-10">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold text-lg flex-1">{pageTitle}</h1>
            <NotificationBell />
          </header>
          <div className="flex-1 p-6 bg-background">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}