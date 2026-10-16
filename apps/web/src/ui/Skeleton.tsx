import type { CSSProperties } from 'react';

type Props = { w?: CSSProperties['width']; h?: CSSProperties['height']; round?: boolean; className?: string };

/**
 * A placeholder block with a slow shimmer (stilled under prefers-reduced-motion
 * by the global rule in base.css). Decorative: the surrounding region carries
 * the accessible "loading" state, not each block.
 */
export function Skeleton({ w = '100%', h = 14, round = false, className = '' }: Props) {
  return (
    <span
      aria-hidden
      className={`skeleton${round ? ' skeleton--round' : ''} ${className}`}
      style={{ width: w, height: h }}
    />
  );
}
