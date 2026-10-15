import { useId, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import type { Ms } from '../../lib/time';
import { formatMs, parseTime } from '../../lib/time';
import { IconButton } from '../../ui/IconButton';

type Props = {
  label: string;
  value: Ms | null;
  /** Returns an error message to show, or null if the value was accepted. */
  onCommit: (ms: Ms) => string | null;
  /** Same contract as onCommit: an error message, or null if accepted. */
  onUsePlayhead: () => string | null;
  disabled?: boolean;
  testId: string;
};

/**
 * Exact time entry. Accepts "1:23.456", "83.456", "83". Commits on Enter or
 * blur; Escape reverts. A rejected value stays in the box with the reason, so
 * a typo is never silently "corrected" into a different time.
 */
export function TimeField({ label, value, onCommit, onUsePlayhead, disabled, testId }: Props) {
  const id = useId();
  const shown = value === null ? '' : formatMs(value);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Escape blurs the field; the blur must not commit the draft Escape just discarded.
  const cancelled = useRef(false);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (draft === null || draft === shown) return setDraft(null);
    const ms = parseTime(draft);
    const problem = ms === null ? 'Use m:ss.mmm, e.g. 1:23.456' : onCommit(ms);
    setError(problem);
    if (!problem) setDraft(null);
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field__row">
        <input
          id={id}
          className="mono"
          data-testid={testId}
          value={draft ?? shown}
          placeholder={value === null ? 'untimed' : undefined}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              cancelled.current = true;
              setDraft(null);
              setError(null);
              e.currentTarget.blur();
            }
          }}
        />
        <IconButton
          label={`Set ${label.toLowerCase()} to playhead`}
          onClick={() => {
            setDraft(null);
            setError(onUsePlayhead());
          }}
          disabled={disabled}
        >
          <Crosshair size={14} />
        </IconButton>
      </div>
      {error && (
        <span id={`${id}-err`} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
