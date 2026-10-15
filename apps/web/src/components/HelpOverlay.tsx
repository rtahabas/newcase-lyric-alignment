import { COMMANDS } from '../keyboard/commands';
import type { Command } from '../keyboard/types';
import { Modal } from '../ui/Modal';

const GROUPS: Command['group'][] = ['Timing', 'Listen', 'Select', 'Edit', 'View'];

/** Rendered from the same table the key handler uses, so it cannot go stale. */
export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Keyboard shortcuts"
      onClose={onClose}
      wide
      description="On the timeline: drag a block to move it (with the whole selection), drag its edges to trim. Touching edges move together; hold Alt to move freely without snapping."
    >
      <div className="help__grid">
        {GROUPS.map((g) => (
          <section key={g}>
            <h3>{g}</h3>
            <dl>
              {COMMANDS.filter((c) => c.group === g).map((c) => (
                <div key={c.label} className="help__row">
                  <dt>
                    {c.keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </dt>
                  <dd>{c.label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
