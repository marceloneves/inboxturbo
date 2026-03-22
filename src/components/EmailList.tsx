import type { Email } from '@/data/mockData';
import { EmailListItem } from '@/components/EmailListItem';

interface EmailListProps {
  emails: Email[];
  activeEmailId: string | null;
  onSelectEmail: (email: Email) => void;
}

export function EmailList({ emails, activeEmailId, onSelectEmail }: EmailListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          isActive={email.id === activeEmailId}
          onClick={() => onSelectEmail(email)}
        />
      ))}
    </div>
  );
}
