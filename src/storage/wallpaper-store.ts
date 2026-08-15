/**
 * IndexedDB-backed wallpaper storage (pure web fallback). Wallpaper bytes are
 * stored as Blobs under the plugin's own database — never Base64 in
 * localStorage and never a raw filesystem path. Every call is a graceful
 * no-op/undefined when IndexedDB is unavailable, so a failed wallpaper load
 * simply falls back to the theme background.
 */

const DB_NAME = 'dsh-desktop-themes';
const DB_VERSION = 1;
const STORE = 'wallpapers';

export interface WallpaperRecord {
  id: string;
  name: string;
  blob: Blob;
  createdAt: number;
}

export interface WallpaperMeta {
  id: string;
  name: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  return openDb().then((db) => {
    if (db === null) return undefined;
    return new Promise<T | undefined>((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE, mode);
      } catch {
        db.close();
        resolve(undefined);
        return;
      }
      const store = tx.objectStore(STORE);
      let request: IDBRequest<T>;
      try {
        request = fn(store);
      } catch {
        db.close();
        resolve(undefined);
        return;
      }
      request.onsuccess = () => {
        resolve(request.result);
        db.close();
      };
      request.onerror = () => {
        resolve(undefined);
        db.close();
      };
    });
  });
}

/** Generate a stable, unique resource id for a wallpaper. */
export function newWallpaperId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `wp-${Date.now().toString(36)}-${rand}`;
}

/** Persist a wallpaper blob. */
export async function putWallpaper(id: string, name: string, blob: Blob): Promise<boolean> {
  const result = await withStore('readwrite', (store) => {
    const record: WallpaperRecord = { id, name, blob, createdAt: Date.now() };
    return store.put(record) as IDBRequest<IDBValidKey>;
  });
  return result !== undefined;
}

/** Load a wallpaper blob by id (undefined when missing/unavailable). */
export async function getWallpaper(id: string): Promise<WallpaperRecord | undefined> {
  return withStore<WallpaperRecord>('readonly', (store) => store.get(id) as IDBRequest<WallpaperRecord>);
}

/** Remove a wallpaper blob. */
export async function deleteWallpaper(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id) as IDBRequest<undefined>);
}

/** List persisted wallpaper metadata (most recent first). */
export async function listWallpapers(): Promise<WallpaperMeta[]> {
  const records = await withStore<WallpaperRecord[]>('readonly', (store) => store.getAll() as IDBRequest<WallpaperRecord[]>);
  if (!records) return [];
  return records
    .map((r) => ({ id: r.id, name: r.name, createdAt: r.createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
