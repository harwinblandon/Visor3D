import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { getStorageStream, uploadFileToStorage, deleteFromStorage } from "../services/storage.service.js";
import { storageEnabled } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

// En plataformas de disco efímero (Render free tier) el disco local se borra en cada
// redeploy/reinicio del contenedor; R2 es la copia durable. El disco local funciona como
// caché: se sirve desde ahí si ya está, y si no (tras un reinicio), se descarga de R2 una
// sola vez bajo demanda. inFlight evita descargar el mismo archivo varias veces en paralelo
// si llegan varias peticiones a la vez justo después de un reinicio.
const inFlight = new Map<string, Promise<void>>();

/** Ruta absoluta local de relativeKey, descargándolo de R2 primero si hace falta. Sin R2
 * configurado, asume que el archivo ya está en disco (desarrollo local de siempre). */
export async function ensureLocalFile(relativeKey: string): Promise<string> {
  const absPath = path.join(uploadsRoot, relativeKey);
  if (existsSync(absPath) || !storageEnabled) return absPath;

  let download = inFlight.get(relativeKey);
  if (!download) {
    download = (async () => {
      await mkdir(path.dirname(absPath), { recursive: true });
      const { stream } = await getStorageStream(relativeKey);
      await pipeline(stream, createWriteStream(absPath));
    })();
    inFlight.set(relativeKey, download);
    download.finally(() => inFlight.delete(relativeKey));
  }
  await download;
  return absPath;
}

/** Sube a R2 el archivo que ya está en disco local (uploadsRoot/relativeKey), para que
 * sobreviva un redeploy/reinicio. Nunca revienta la operación que lo llama: si R2 no está
 * configurado o la subida falla, el archivo local sigue funcionando igual hasta el próximo
 * reinicio -- solo se pierde la durabilidad, no la subida en sí. */
export async function persistLocalFile(relativeKey: string, contentType?: string): Promise<void> {
  if (!storageEnabled) return;
  try {
    await uploadFileToStorage(relativeKey, path.join(uploadsRoot, relativeKey), contentType);
  } catch (err) {
    console.error(`No se pudo subir ${relativeKey} a R2 (sigue disponible localmente hasta el próximo reinicio):`, err);
  }
}

/** Borra tanto la copia local (si existe) como la de R2. */
export async function removeFile(relativeKey: string): Promise<void> {
  try {
    await unlink(path.join(uploadsRoot, relativeKey));
  } catch {
    // no pasa nada si ya no estaba en disco local (p.ej. tras un redeploy)
  }
  if (storageEnabled) await deleteFromStorage(relativeKey);
}
