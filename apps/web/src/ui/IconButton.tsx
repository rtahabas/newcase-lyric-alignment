import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accessible name and tooltip text. */
  label: string;
  /** Shown in the tooltip, e.g. "⌘Z". */
  shortcut?: string;
  children: ReactNode;
};

/** A button whose name is in a tooltip rather than on its face. Always has an aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, shortcut, children, className, ...rest },
  ref,
) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button ref={ref} aria-label={label} className={`icon-btn ${className ?? ''}`} {...rest}>
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={6}>
          {label}
          {shortcut && <kbd>{shortcut}</kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
});
