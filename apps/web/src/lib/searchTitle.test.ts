import { describe, expect, it } from 'vitest';
import { searchTitle } from './searchTitle';

describe('searchTitle', () => {
  it.each([
    ['Kendim ettim kendim buldum(Taha (Baş)', 'Kendim ettim kendim buldum'],
    ['Song (feat. Someone) [Remastered 2011]', 'Song'],
    ['Song feat. Someone Else', 'Song'],
    ['Song - Live at Wembley', 'Song'],
    ['Hold On (Hold On)', 'Hold On'],
    ['Twenty-One Pilots', 'Twenty-One Pilots'],
    ['Plain title', 'Plain title'],
  ])('%s -> %s', (raw, clean) => {
    expect(searchTitle(raw)).toBe(clean);
  });
});
