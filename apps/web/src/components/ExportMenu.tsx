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

/** "Export LRC" in one click (as in the wireframe), other formats behind the chevron. */
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
      <div className="split-btn" role="group" aria-label="Export">
        <button onClick={() => run(FORMATS[0])} data-testid="export-lrc">
          <Download size={16} /> Export LRC
        </button>
        <Menu.Root>
          <Menu.Trigger className="btn" aria-label="More export formats">
            <ChevronDown size={14} />
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
      </div>
      {note && (
        <span className="muted small" role="status">
          {note}
        </span>
      )}
    </>
  );
}
