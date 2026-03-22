import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { Topbar } from '@/components/Topbar';
import { ComposeEmailModal } from '@/components/ComposeEmailModal';

export default function AppLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCompose={() => setComposeOpen(true)}
        />
        <main className="flex-1 overflow-hidden">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
      <ComposeEmailModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
}
