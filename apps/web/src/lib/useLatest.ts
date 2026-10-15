import { useEffect, useRef } from 'react';

/**
 * A ref that always holds the latest value. Lets stable callbacks (handed to
 * memoised children, window listeners) read current state without being
 * recreated - and without re-rendering every memoised child - on each change.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
