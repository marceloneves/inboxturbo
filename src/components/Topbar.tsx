import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/UserMenu';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCompose: () => void;
}

export function Topbar({ searchQuery, onSearchChange, onCompose }: TopbarProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:px-6">
      <div className="lg:hidden w-9" /> {/* space for mobile menu button */}
      <div className="relative flex-1 max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar e-mails..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>
      <Button onClick={onCompose} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Novo e-mail</span>
      </Button>
      <UserMenu />
    </header>
  );
}
