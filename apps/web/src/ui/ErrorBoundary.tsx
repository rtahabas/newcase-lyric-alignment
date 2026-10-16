import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * A render error shows a way out instead of a blank page. Unmounting the
 * editor also runs its cleanup, which writes a local track's pending autosave
 * (useSync), so a crash does not cost the last edits. Server tracks keep their
 * last saved version; unsaved server edits are lost, and the message says so.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Editor crashed', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="splash" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">
          The editor hit an error: <code>{error.message}</code>. Tracks you brought were saved in this
          browser; unsaved edits to the server track may be lost.
        </p>
        <div className="row center">
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
