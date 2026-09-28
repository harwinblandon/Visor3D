/**
 * multer/busboy decodifica el nombre de archivo del header multipart como latin1 en vez de
 * UTF-8 (bug histórico de la librería: https://github.com/expressjs/multer/issues/1104) --
 * un nombre con tildes como "Vías.zip" llega a file.originalname como "VÃ­as.zip". Se revierte
 * reinterpretando los bytes como latin1 y recodificando a UTF-8, pero solo cuando el nombre
 * tiene bytes fuera de ASCII y el resultado es UTF-8 válido, para no tocar (ni corromper) un
 * nombre que ya estaba bien.
 */
export function fixUploadFilename(name: string): string {
  if (!/[\u0080-ÿ]/.test(name)) return name;
  const fixed = Buffer.from(name, "latin1").toString("utf8");
  return fixed.includes("�") ? name : fixed;
}
