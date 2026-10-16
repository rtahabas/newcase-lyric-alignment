/**
 * Short random ids. `crypto.randomUUID` only exists in secure contexts (https or
 * localhost); over plain http on a LAN address it is missing, so fall back.
 */
export function shortId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

/** Ids for lines the client creates; prefixed so they never collide with seeded numeric ids. */
export const newLineId = (): string => `c-${shortId()}`;
