import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmailAccount } from '@/data/mockData';

interface AccountSelectorProps {
  accounts: EmailAccount[];
  value: string;
  onValueChange: (value: string) => void;
}

export function AccountSelector({ accounts, value, onValueChange }: AccountSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecionar conta de envio" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((acc) => (
          <SelectItem key={acc.id} value={acc.id}>
            <span className="flex items-center gap-2">
              <span className="font-medium">{acc.friendly_name}</span>
              <span className="text-muted-foreground">({acc.email_address})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
