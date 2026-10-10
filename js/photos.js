// Fotos de progresso no IndexedDB (não cabem no localStorage).
// Imagens são redimensionadas para no máx. 1080px e salvas como JPEG.

const DB = 'fitquest';
const STORE = 'photos';
let dbp = null;

function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
}

const local = {
  put: (rec) => tx('readwrite', (s) => s.put(rec)),
  get: (id) => tx('readonly', (s) => s.get(id)),
  del: (id) => tx('readwrite', (s) => s.delete(id)),
};

// Espelho remoto (Supabase Storage), registrado por cloud.js quando há login.
let remote = null;
export function setPhotoRemote(r) {
  remote = r;
}

export async function putPhoto(rec) {
  await local.put(rec);
  remote?.upload(rec).catch((e) => console.warn('Foto não enviada à nuvem', e));
}

// IndexedDB primeiro; se não estiver no aparelho (ex.: outro celular), baixa da nuvem.
export async function getPhoto(id) {
  const hit = await local.get(id);
  if (hit || !remote) return hit;
  try {
    const rec = await remote.download(id);
    if (rec) await local.put(rec);
    return rec;
  } catch {
    return undefined;
  }
}

export async function deletePhoto(id) {
  await local.del(id);
  remote?.remove(id).catch(() => {});
}

export const allPhotos = () => tx('readonly', (s) => s.getAll());

export async function compressImage(file, max = 1080, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
