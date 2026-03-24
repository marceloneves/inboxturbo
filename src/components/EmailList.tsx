import type { Email } from '@/types/email';
import { EmailListItem } from '@/components/EmailListItem';
import type { EmailLabel } from '@/hooks/useLabels';

interface EmailListProps {
  emails: Email[];
  activeEmailId: string | null;
  onSelectEmail: (email: Email) => void;
  isPinnedFn?: (email: Email) => boolean;
  getLabelsFn?: (email: Email) => EmailLabel[];
}

export function EmailList({ emails, activeEmailId, onSelectEmail, isPinnedFn, getLabelsFn }: EmailListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          isActive={email.id === activeEmailId}
          isPinned={isPinnedFn?.(email)}
          labels={getLabelsFn?.(email)}
          onClick={() => onSelectEmail(email)}
        />
      ))}
    </div>
  );
}
