/**
 * Audio blobs for user-brought tracks, in IndexedDB. localStorage cannot hold a
 * few megabytes of audio, and without this a reload would leave a project with
 * timings but nothing to play.
 */
const DB_NAME = 'lyric-align';
const STORE = 'audio';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) =>
    new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'));
    }).finally(() => db.close()),
  );
}

export const putAudio = (id: string, blob: Blob) =>
  run('readwrite', (s) => s.put(blob, id)).then(() => undefined);
export const getAudio = (id: string) =>
  run<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);
export const deleteAudio = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => undefined);
