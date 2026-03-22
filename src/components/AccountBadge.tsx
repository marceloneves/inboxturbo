import { cn } from '@/lib/utils';

const ACCOUNT_COLORS: Record<string, string> = {
  personal: 'bg-primary/15 text-primary border-primary/20',
  comercial: 'bg-success/15 text-success border-success/20',
  suporte: 'bg-account-support/15 text-account-support border-account-support/20',
  financeiro: 'bg-warning/15 text-warning border-warning/20',
};

interface AccountBadgeProps {
  name: string;
  className?: string;
}

export function AccountBadge({ name, className }: AccountBadgeProps) {
  const key = name.toLowerCase();
  const colors = ACCOUNT_COLORS[key] || 'bg-muted text-muted-foreground border-border';

  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium', colors, className)}>
      {name}
    </span>
  );
}
