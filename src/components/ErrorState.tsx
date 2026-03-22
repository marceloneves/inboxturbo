import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Algo deu errado.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
      <div className="rounded-2xl bg-destructive/10 p-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Erro</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && <Button variant="outline" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  );
}
