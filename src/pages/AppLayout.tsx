import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { Topbar } from '@/components/Topbar';

const MAIL_ROUTES = ['/app/inbox', '/app/sent', '/app/archive', '/app/trash'];

export default function AppLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [composing, setComposing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleCompose = () => {
    const isMailRoute = MAIL_ROUTES.some((r) => location.pathname.startsWith(r));
    if (!isMailRoute) {
      navigate('/app/inbox');
    }
    // Use setTimeout to ensure navigation completes before setting composing
    setTimeout(() => setComposing(true), isMailRoute ? 0 : 50);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCompose={handleCompose}
        />
        <main className="flex-1 overflow-hidden">
          <Outlet context={{ searchQuery, composing, setComposing }} />
        </main>
      </div>
    </div>
  );
}
