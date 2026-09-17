#!/usr/bin/env node
// Corrige exportaciones .glb de Metashape para uso en el visor web:
//   1. Convierte texturas en formato no soportado por navegadores (TIFF, BMP) a JPEG.
//   2. Convierte la orientacion de ejes Z-arriba (topografica) a Y-arriba (estandar glTF).
//   3. Centra el modelo cerca del origen (evita que quede "flotando" lejos por la elevacion absoluta).
//   4. Decima la malla (mallas fotogrametricas suelen traer muchos mas vertices de los que
//      un visor web necesita) y comprime la geometria con Draco.
//
// Uso: node tools/fix-model-export.mjs <entrada.glb> <salida.glb> [ratioDecimado]
//   ratioDecimado: fraccion de triangulos a conservar (default 0.15 = 15%)

import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco, simplify } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const WEB_SAFE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function main() {
  const [, , inputPath, outputPath, ratioArg] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Uso: node tools/fix-model-export.mjs <entrada.glb> <salida.glb> [ratioDecimado]");
    process.exit(1);
  }
  const ratio = ratioArg ? Number(ratioArg) : 0.15;

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });

  const document = await io.read(inputPath);
  const root = document.getRoot();

  await fixTextures(root);
  centerAndFixOrientation(document, root);

  await MeshoptSimplifier.ready;
  console.log(`Decimando malla a ${(ratio * 100).toFixed(0)}% de los triangulos originales...`);
  await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001, lockBorder: true }));

  await document.transform(draco({ quantizePosition: 14, quantizeTexcoord: 12, quantizeNormal: 10 }));

  await io.write(outputPath, document);
  console.log(`Listo: ${outputPath}`);
}

async function fixTextures(root) {
  for (const texture of root.listTextures()) {
    const mimeType = texture.getMimeType();
    if (WEB_SAFE_MIME_TYPES.has(mimeType)) continue;

    console.log(`Convirtiendo textura "${texture.getName() || "(sin nombre)"}" de ${mimeType} a image/jpeg...`);
    const original = texture.getImage();
    const jpegBuffer = await sharp(Buffer.from(original)).jpeg({ quality: 90 }).toBuffer();
    texture.setImage(jpegBuffer).setMimeType("image/jpeg");
  }
}

function centerAndFixOrientation(document, root) {
  const [min, max] = computeGlobalBounds(root);
  const center = min.map((v, i) => (v + max[i]) / 2);

  // Rotacion -90 grados en X: (x, y, z)_Z-arriba -> (x, z, -y)_Y-arriba
  const rotation = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];
  const rotatedCenter = [center[0], center[2], -center[1]];
  const translation = rotatedCenter.map((v) => -v);

  for (const scene of root.listScenes()) {
    for (const node of scene.listChildren()) {
      node.setRotation(rotation);
      node.setTranslation(translation);
    }
  }

  console.log("Bounding box original:", { min, max });
  console.log("Centro detectado:", center);
  console.log("Transformacion aplicada: rotacion -90deg en X + traslacion", translation);
}

function computeGlobalBounds(root) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute("POSITION");
      if (!position) continue;
      const pMin = position.getMinNormalized([0, 0, 0]);
      const pMax = position.getMaxNormalized([0, 0, 0]);
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], pMin[i]);
        max[i] = Math.max(max[i], pMax[i]);
      }
    }
  }

  return [min, max];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
