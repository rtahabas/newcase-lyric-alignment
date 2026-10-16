import { Skeleton } from '../ui/Skeleton';
import { usePaneWidths } from '../app/usePaneWidths';

const ROWS = 10;
/** Fixed, varied widths so the placeholder reads as text without random flicker between renders. */
const ROW_WIDTHS = ['82%', '74%', '88%', '66%', '79%', '71%', '85%', '62%', '77%', '69%'];

/**
 * The editor's own layout, empty, while the track loads: same grid and pane
 * classes as the real thing, so content lands where the user is already looking.
 */
export function AppSkeleton() {
  // The user's own pane widths, so nothing jumps sideways when the editor replaces this.
  const { widths } = usePaneWidths();
  return (
    <div className="app" role="status" aria-busy="true" aria-label="Loading track" data-testid="app-skeleton">
      <header className="topbar">
        <div className="topbar__track">
          <Skeleton w={120} h={34} />
          <span className="skeleton-stack">
            <Skeleton w={150} h={16} />
            <Skeleton w={190} h={11} />
          </span>
        </div>
        <div className="topbar__transport">
          <Skeleton w={38} h={38} round />
          <Skeleton w={110} h={22} />
        </div>
        <div className="topbar__actions">
          <Skeleton w={130} h={34} />
          <Skeleton w={70} h={34} />
        </div>
      </header>
      <main
        className="workspace workspace--skeleton"
        style={{
          ['--lyrics-w' as string]: `${widths.lyrics}px`,
          ['--inspector-w' as string]: `${widths.inspector}px`,
        }}
      >
        <aside className="pane lyrics">
          <Skeleton w={70} h={16} />
          <Skeleton h={72} />
          <Skeleton h={34} />
          {Array.from({ length: ROWS }, (_, i) => (
            <Skeleton key={i} w={ROW_WIDTHS[i]} h={22} />
          ))}
        </aside>
        <section className="stage">
          <div className="timeline">
            <div className="timeline__skeleton">
              <Skeleton h={24} />
              <WaveSkeleton />
            </div>
          </div>
        </section>
        <aside className="pane inspector">
          <Skeleton w={110} h={16} />
          <Skeleton h={64} />
          <Skeleton h={34} />
          <Skeleton h={34} />
        </aside>
      </main>
      <span className="visually-hidden">Loading track…</span>
    </div>
  );
}

/** Bars in the waveform's place: heights from a fixed sine mix, so it looks like audio, not noise. */
export function WaveSkeleton({ bars = 90 }: { bars?: number }) {
  return (
    <span className="wave-skeleton" aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const h = 22 + Math.abs(Math.sin(i * 0.37) * 38 + Math.sin(i * 1.13) * 18);
        return (
          <span key={i} className="skeleton wave-skeleton__bar" style={{ height: `${Math.min(100, h)}%` }} />
        );
      })}
    </span>
  );
}
