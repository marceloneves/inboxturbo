import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { Topbar } from '@/components/Topbar';

export default function AppLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [composing, setComposing] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCompose={() => setComposing(true)}
        />
        <main className="flex-1 overflow-hidden">
          <Outlet context={{ searchQuery, composing, setComposing }} />
        </main>
      </div>
    </div>
  );
}
