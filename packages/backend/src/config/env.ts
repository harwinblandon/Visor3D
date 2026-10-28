import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", "..", "..", "..", ".env") });

export const env = {
  // Railway (y la mayoría de plataformas gestionadas) inyectan PORT en runtime.
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://visor3d:visor3d@localhost:5432/visor3d",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  frontendDistPath: process.env.FRONTEND_DIST_PATH ?? "",
  // Almacenamiento persistente (Cloudflare R2, API compatible con S3) para los archivos
  // subidos -- necesario en plataformas con disco efímero (Render free tier), donde el
  // disco local se borra en cada redeploy/reinicio. Si quedan vacías, storage.service.ts
  // no se usa y todo sigue funcionando solo con disco local (como en desarrollo).
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "",
  },
};

export const storageEnabled = !!(env.r2.endpoint && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket);
