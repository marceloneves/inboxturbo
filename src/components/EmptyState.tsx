import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
      <div className="rounded-2xl bg-muted p-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">{actionLabel}</Button>
      )}
    </div>
  );
}
