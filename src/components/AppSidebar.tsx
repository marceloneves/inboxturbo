import { useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Inbox, Send, Trash2, Archive, Link2, UserCircle, Settings, LogOut, Mail, Menu, X, BarChart3, Sun, Moon, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useMoveEmail } from '@/hooks/useMoveEmail';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const folderItems = [
  { label: 'Caixa de entrada', icon: Inbox, path: '/app/inbox', folder: 'inbox' },
  { label: 'Enviados', icon: Send, path: '/app/sent', folder: 'sent' },
  { label: 'Arquivo', icon: Archive, path: '/app/arquivo', folder: 'archive' },
  { label: 'Lixeira', icon: Trash2, path: '/app/trash', folder: 'trash' },
];

const otherItems = [
  { label: 'Estatísticas', icon: BarChart3, path: '/app/estatisticas' },
  { label: 'Contas conectadas', icon: Link2, path: '/app/contas' },
  { label: 'Perfil', icon: UserCircle, path: '/app/perfil' },
  { label: 'Configurações', icon: Settings, path: '/app/configuracoes' },
  { label: 'Planos', icon: Crown, path: '/app/planos' },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Mail className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && <span className="text-lg font-bold tracking-tight">inboxTurbo</span>}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="border-t px-3 py-3 space-y-1">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>}
        </button>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border bg-card shadow-sm lg:hidden"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar transition-transform duration-300 lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r bg-sidebar shrink-0 transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-card p-0 shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="text-xs">{collapsed ? '›' : '‹'}</span>
        </Button>
        {sidebarContent}
      </aside>
    </>
  );
}
