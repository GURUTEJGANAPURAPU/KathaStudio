export const KATHA_DB_NAME = "katha-studio-assets";
export const KATHA_DB_VERSION = 1;
const STORE = "audio-assets";

export type StoredAudio = { id: string; blob: Blob; name: string; type: string; createdAt: string };

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Browser audio storage is unavailable."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KATHA_DB_NAME, KATHA_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local audio storage."));
  });
}

export async function saveAudioAsset(blob: Blob, name = "audio.wav"): Promise<string> {
  const id = crypto.randomUUID();
  const asset: StoredAudio = { id, blob, name, type: blob.type || "application/octet-stream", createdAt: new Date().toISOString() };
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(asset);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not save audio in this browser."));
  }).finally(() => db.close());
  return id;
}

export async function getAudioAsset(id: string): Promise<StoredAudio | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    request.onsuccess = () => { db.close(); resolve(request.result as StoredAudio | undefined); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not read local audio.")); };
  });
}

export async function deleteAudioAsset(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not remove local audio."));
  }).finally(() => db.close());
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Could not read the audio file."));
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the audio file."));
    reader.readAsDataURL(blob);
  });
}

export function base64ToAudioBlob(encoded: string, type = "audio/wav"): Blob {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}
