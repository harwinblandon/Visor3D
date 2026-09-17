import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

function makeStorage(subdir: string) {
  return multer.diskStorage({
    destination: path.join(uploadsRoot, subdir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

export const uploadModel = multer({
  storage: makeStorage("models"),
  limits: { fileSize: 500 * 1024 * 1024 },
});

export const uploadPhotos = multer({
  storage: makeStorage("photos"),
  limits: { fileSize: 25 * 1024 * 1024 },
});
