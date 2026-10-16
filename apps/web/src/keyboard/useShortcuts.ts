import { useEffect, useRef } from 'react';
import type { CommandContext } from './types';
import { COMMANDS } from './commands';

/** Typing in a field must never trigger a shortcut (except Escape, handled by the field). */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Keys inside an open menu or dialog belong to it (Enter must click "Delete", not stamp a line). */
const CONTROLS = 'button, a[href], summary, [role="button"], input[type="checkbox"]';
const controlOf = (t: EventTarget | null) => (t instanceof Element ? t.closest(CONTROLS) : null);

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
    /**
     * The control the pointer last focused. Enter/Space on a control reached
     * with the keyboard (Tab) activate it - Tab to "Keep mine", press Enter. On a
     * control that was just clicked they go back to stamping and playback.
     * (`:focus-visible` cannot tell: Chromium turns it on at the key press.)
     */
    let clicked: Element | null = null;
    const onPointer = (e: PointerEvent) => (clicked = controlOf(e.target));
    const onFocus = (e: FocusEvent) => {
      if (controlOf(e.target) !== clicked) clicked = null;
    };
    const activatesControl = (e: KeyboardEvent) => {
      const control = controlOf(e.target);
      return (e.key === 'Enter' || e.key === ' ') && !!control && control !== clicked;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || insideOverlay(e.target) || activatesControl(e)) return;
      const isSave = (e.metaKey || e.ctrlKey) && e.key === 's';
      if (isTyping(e.target) && !isSave) return;
      const cmd = COMMANDS.find((c) => c.match(e));
      if (!cmd) return;
      // Holding Enter must not stamp line after line; nudges and arrows may repeat.
      if (e.repeat && cmd.once) {
        e.preventDefault();
        return;
      }
      // A mouse-focused button would otherwise also "click" on Space/Enter.
      e.preventDefault();
      cmd.run(ref.current, e);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('focusin', onFocus, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('focusin', onFocus, true);
    };
  }, [enabled]);
}
