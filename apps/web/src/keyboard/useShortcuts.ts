import { useEffect, useRef } from 'react';
import type { CommandContext } from './types';
import { COMMANDS } from './commands';

/** Typing in a field must never trigger a shortcut (except Escape, handled by the field). */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Keys inside an open menu or dialog belong to it (Enter must click "Delete", not stamp a line). */
const insideOverlay = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('[role="dialog"], [role="menu"], [role="alertdialog"]');

/**
 * One window-level listener for the whole editor. The context is read through
 * a ref so the listener is attached once, not on every render.
 */
export function useShortcuts(ctx: CommandContext, enabled: boolean): void {
  const ref = useRef(ctx);
  useEffect(() => {
    ref.current = ctx;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || insideOverlay(e.target)) return;
      const isSave = (e.metaKey || e.ctrlKey) && e.key === 's';
      if (isTyping(e.target) && !isSave) return;
      const cmd = COMMANDS.find((c) => c.match(e));
      if (!cmd) return;
      // Holding Enter must not stamp line after line; nudges and arrows may repeat.
      if (e.repeat && cmd.once) {
        e.preventDefault();
        return;
      }
      // Also stops a focused button from "clicking" on Space/Enter on top of the command.
      e.preventDefault();
      cmd.run(ref.current, e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
