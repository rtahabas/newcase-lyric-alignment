/**
 * Ids for lines the client creates. Prefixed so they can never collide with the
 * server's seeded numeric-string ids.
 */
export function newLineId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `c-${rand}`;
}
