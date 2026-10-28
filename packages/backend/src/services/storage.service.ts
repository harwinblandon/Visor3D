import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "node:fs";
import type { Readable } from "node:stream";
import { env, storageEnabled } from "../config/env.js";

// Cliente S3 apuntando a Cloudflare R2 (API compatible con S3). region "auto" es lo que
// espera R2 -- no es una región real de AWS.
const client = storageEnabled
  ? new S3Client({
      region: "auto",
      endpoint: env.r2.endpoint,
      credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
    })
  : null;

function requireClient(): S3Client {
  if (!client) throw new Error("R2 no está configurado (faltan variables de entorno R2_*)");
  return client;
}

/**
 * Sube un archivo YA ESCRITO EN DISCO LOCAL a R2, leyéndolo por streaming (Upload de
 * lib-storage hace multipart y nunca carga el archivo completo en memoria) -- importante
 * porque las ortofotos pueden pesar varios cientos de MB y el plan gratuito de Render
 * tiene poca RAM.
 */
export async function uploadFileToStorage(key: string, localAbsolutePath: string, contentType?: string): Promise<void> {
  const upload = new Upload({
    client: requireClient(),
    params: { Bucket: env.r2.bucket, Key: key, Body: createReadStream(localAbsolutePath), ContentType: contentType },
  });
  await upload.done();
}

export interface StorageStream {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

export async function getStorageStream(key: string): Promise<StorageStream> {
  const res = await requireClient().send(new GetObjectCommand({ Bucket: env.r2.bucket, Key: key }));
  return { stream: res.Body as Readable, contentType: res.ContentType, contentLength: res.ContentLength };
}

export async function deleteFromStorage(key: string): Promise<void> {
  try {
    await requireClient().send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }));
  } catch (err) {
    console.error(`No se pudo borrar ${key} de R2:`, err);
  }
}
