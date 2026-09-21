#!/usr/bin/env node
// Variante de fix-model-export.mjs para modelos con jerarquia de nodos compleja
// (exportados de un programa BIM/CAD, no de fotogrametria): muchas mallas, cada
// una en su propio nodo con transformacion propia. La version original calculaba
// el centro ignorando esas transformaciones (asumiendo, como en las exportaciones
// de Metashape, una sola malla en el origen), lo que en un modelo asi produce un
// centro completamente erroneo.
//
// Ademas, a diferencia de Metashape, este tipo de exportacion puede venir con la
// orientacion Y-arriba ya corregida en el nodo raiz (matriz ya no trivial). Por
// eso aqui NO se reemplaza la rotacion del nodo raiz existente: solo se envuelve
// en un nuevo nodo padre que aplica unicamente la traslacion necesaria para
// centrar el modelo, dejando intacta la orientacion que ya trae.
//
// Uso: node tools/fix-model-export-bim.mjs <entrada.glb> <salida.glb> [ratioDecimado]

import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco, simplify, dedup, weld, join, flatten } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

async function main() {
  const [, , inputPath, outputPath, ratioArg] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Uso: node tools/fix-model-export-bim.mjs <entrada.glb> <salida.glb> [ratioDecimado]");
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

  console.log("Eliminando duplicados (texturas/materiales/mallas identicos)...");
  await document.transform(dedup());

  await resizeTextures(root);
  centerOnly(document, root);

  console.log(`Uniendo ${root.listMeshes().length} mallas en la menor cantidad posible de draw calls...`);
  await document.transform(weld(), flatten(), join());
  console.log(`Mallas tras la union: ${root.listMeshes().length}`);

  await MeshoptSimplifier.ready;
  console.log(`Decimando malla a ${(ratio * 100).toFixed(0)}% de los triangulos originales...`);
  await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001, lockBorder: true }));

  await document.transform(draco({ quantizePosition: 14, quantizeTexcoord: 12, quantizeNormal: 10 }));

  await io.write(outputPath, document);
  console.log(`Listo: ${outputPath}`);
}

const MAX_TEXTURE_DIM = 512;
const JPEG_QUALITY = 78;

// Esta exportacion trae una biblioteca de materiales con texturas de origen sin
// procesar (algunas de hasta 7000x4500 px) usadas en superficies pequenas: eso,
// no la geometria, es lo que realmente pesa. Se reduce cada textura a un maximo
// razonable para visor web y se recodifica (JPEG salvo que tenga canal alfa).
async function resizeTextures(root) {
  let originalTotal = 0;
  let finalTotal = 0;

  for (const texture of root.listTextures()) {
    const original = texture.getImage();
    if (!original) continue;
    originalTotal += original.byteLength;

    const img = sharp(Buffer.from(original));
    const meta = await img.metadata();
    let pipeline = img;
    if ((meta.width ?? 0) > MAX_TEXTURE_DIM || (meta.height ?? 0) > MAX_TEXTURE_DIM) {
      pipeline = pipeline.resize(MAX_TEXTURE_DIM, MAX_TEXTURE_DIM, { fit: "inside", withoutEnlargement: true });
    }

    let outBuffer, mimeType;
    if (meta.hasAlpha) {
      outBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      mimeType = "image/png";
    } else {
      outBuffer = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
      mimeType = "image/jpeg";
    }

    texture.setImage(outBuffer).setMimeType(mimeType);
    finalTotal += outBuffer.byteLength;
  }

  console.log(
    `Texturas: ${(originalTotal / 1024 / 1024).toFixed(1)} MB -> ${(finalTotal / 1024 / 1024).toFixed(1)} MB`,
  );
}

function centerOnly(document, root) {
  const [min, max] = computeWorldBounds(root);
  const center = min.map((v, i) => (v + max[i]) / 2);
  const size = min.map((v, i) => max[i] - v);
  console.log("Bounding box mundial (real, con transformaciones aplicadas):", { min, max });
  console.log("Tamano:", size);
  console.log("Centro detectado:", center);

  const translation = center.map((v) => -v);

  for (const scene of root.listScenes()) {
    const existingChildren = scene.listChildren();
    const wrapper = document.createNode("CentradoWrapper").setTranslation(translation);
    for (const child of existingChildren) {
      scene.removeChild(child);
      wrapper.addChild(child);
    }
    scene.addChild(wrapper);
  }

  console.log("Traslacion de centrado aplicada (nodo envolvente, sin tocar la rotacion existente):", translation);
}

function listAllNodes(node, out) {
  out.push(node);
  for (const child of node.listChildren()) listAllNodes(child, out);
}

function transformPoint(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function computeWorldBounds(root) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const scene of root.listScenes()) {
    const nodes = [];
    for (const child of scene.listChildren()) listAllNodes(child, nodes);

    for (const node of nodes) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const wm = node.getWorldMatrix();

      for (const prim of mesh.listPrimitives()) {
        const position = prim.getAttribute("POSITION");
        if (!position) continue;
        const pMin = position.getMinNormalized([0, 0, 0]);
        const pMax = position.getMaxNormalized([0, 0, 0]);

        // Transformar las 8 esquinas de la caja local al espacio mundial.
        for (const cx of [pMin[0], pMax[0]]) {
          for (const cy of [pMin[1], pMax[1]]) {
            for (const cz of [pMin[2], pMax[2]]) {
              const [wx, wy, wz] = transformPoint(wm, cx, cy, cz);
              if (wx < min[0]) min[0] = wx;
              if (wy < min[1]) min[1] = wy;
              if (wz < min[2]) min[2] = wz;
              if (wx > max[0]) max[0] = wx;
              if (wy > max[1]) max[1] = wy;
              if (wz > max[2]) max[2] = wz;
            }
          }
        }
      }
    }
  }

  return [min, max];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
