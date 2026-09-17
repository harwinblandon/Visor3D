import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", "..", "..", "..", ".env") });

export const env = {
  port: Number(process.env.BACKEND_PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://visor3d:visor3d@localhost:5432/visor3d",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
};
