import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Download } from 'lucide-react';
import type { TrackMeta } from '../sources/types';
import { useEditor } from '../app/EditorContext';
import { download, safeFilename, toLrc, toTtml } from '../lib/exporters';

const FORMATS = [
  {
    id: 'lrc',
    label: 'LRC',
    hint: 'most players, Musixmatch-style',
    ext: 'lrc',
    type: 'text/plain',
    build: toLrc,
  },
  {
    id: 'ttml',
    label: 'TTML',
    hint: 'line-level, Apple Music style',
    ext: 'ttml',
    type: 'application/ttml+xml',
    build: toTtml,
  },
] as const;

/** Export dropdown; reports how many untimed lines were left out. */
export function ExportMenu({ meta }: { meta: TrackMeta }) {
  const { editor, durationMs } = useEditor();
  const [note, setNote] = useState<string | null>(null);

  const run = (f: (typeof FORMATS)[number]) => {
    const result = f.build(editor.doc, { title: meta.title, artist: meta.artist, durationMs });
    download(`${safeFilename(meta.title)}.${f.ext}`, result.text, f.type);
    setNote(result.skipped ? `${result.skipped} untimed line(s) left out of the ${f.label}` : null);
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger className="btn">
          <Download size={16} /> Export <ChevronDown size={14} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className="menu" align="end" sideOffset={6}>
            {FORMATS.map((f) => (
              <Menu.Item key={f.id} className="menu__item" onSelect={() => run(f)}>
                <strong>{f.label}</strong>
                <span className="muted small">{f.hint}</span>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      {note && (
        <span className="muted small" role="status">
          {note}
        </span>
      )}
    </>
  );
}
