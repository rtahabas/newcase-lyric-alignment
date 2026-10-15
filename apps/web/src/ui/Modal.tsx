import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

type Props = {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

/** Always-open modal; the parent mounts it to open and unmounts it to close. */
export function Modal({ title, description, onClose, children, wide }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal${wide ? ' modal--wide' : ''}`}
          // Radix links the Description automatically; opt out explicitly only when there is none.
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <header className="modal__header">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label="Close">
              <X size={16} />
            </Dialog.Close>
          </header>
          {description && <Dialog.Description className="muted small">{description}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
