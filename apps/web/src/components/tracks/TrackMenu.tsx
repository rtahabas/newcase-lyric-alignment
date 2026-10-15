import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, ListMusic, Plus, Server, Trash2 } from 'lucide-react';
import type { LocalProject } from '../../sources/local';
import { localKey } from '../../sources/local';
import { SERVER_KEY } from '../../sources/server';
import { ConfirmDelete } from './ConfirmDelete';

type Props = {
  currentKey: string;
  projects: LocalProject[];
  onOpen: (key: string) => void;
  onNew: () => void;
  onDeleted: () => void;
};

/** Switch between the server's track and tracks the user brought; start or delete one. */
export function TrackMenu({ currentKey, projects, onOpen, onNew, onDeleted }: Props) {
  const [deleting, setDeleting] = useState<LocalProject | null>(null);
  const current = projects.find((p) => localKey(p.id) === currentKey);
  const mark = (key: string) =>
    key === currentKey ? <Check size={14} /> : <span className="menu__spacer" />;

  return (
    <>
      <Menu.Root>
        <Menu.Trigger className="btn" data-testid="track-menu">
          <ListMusic size={16} /> Tracks <ChevronDown size={14} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className="menu" align="start" sideOffset={6}>
            <Menu.Item className="menu__item menu__item--row" onSelect={() => onOpen(SERVER_KEY)}>
              {mark(SERVER_KEY)} <Server size={14} /> Seeded track (server)
            </Menu.Item>
            {projects.length > 0 && <Menu.Separator className="menu__sep" />}
            {projects.map((p) => (
              <Menu.Item
                key={p.id}
                className="menu__item menu__item--row"
                onSelect={() => onOpen(localKey(p.id))}
              >
                {mark(localKey(p.id))} {p.title}
                {p.artist && <span className="muted small">· {p.artist}</span>}
              </Menu.Item>
            ))}
            <Menu.Separator className="menu__sep" />
            <Menu.Item className="menu__item menu__item--row" onSelect={onNew} data-testid="new-track">
              <Plus size={14} /> New track from your audio…
            </Menu.Item>
            {current && (
              <Menu.Item
                className="menu__item menu__item--row btn-danger"
                onSelect={() => setDeleting(current)}
              >
                <Trash2 size={14} /> Delete “{current.title}”…
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      {deleting && (
        <ConfirmDelete
          project={deleting}
          onCancel={() => setDeleting(null)}
          onDone={() => {
            setDeleting(null);
            onDeleted();
            onOpen(SERVER_KEY);
          }}
        />
      )}
    </>
  );
}
