import type { Email } from '@/types/email';
import { EmailListItem } from '@/components/EmailListItem';

interface EmailListProps {
  emails: Email[];
  activeEmailId: string | null;
  onSelectEmail: (email: Email) => void;
  isPinnedFn?: (email: Email) => boolean;
  getLabelColorsFn?: (email: Email) => string[];
}

export function EmailList({ emails, activeEmailId, onSelectEmail, isPinnedFn, getLabelColorsFn }: EmailListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          isActive={email.id === activeEmailId}
          isPinned={isPinnedFn?.(email)}
          labelColors={getLabelColorsFn?.(email)}
          onClick={() => onSelectEmail(email)}
        />
      ))}
    </div>
  );
}
