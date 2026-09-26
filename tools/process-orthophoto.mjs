#!/usr/bin/env node
// Convierte una ortofoto georreferenciada (GeoTIFF) en un archivo .mbtiles listo para
// el visor web: reproyecta a Web Mercator (EPSG:3857) y genera una piramide de zoom
// completa, todo corriendo GDAL dentro de un contenedor Docker desechable (no requiere
// instalar GDAL en la maquina local).
//
// Uso:
//   node tools/process-orthophoto.mjs <entrada.tif> <salida.mbtiles> [minZoomOffset] [formato] [maxZoomCap]
//
//   minZoomOffset: cuantos niveles de zoom generar por debajo del maximo (default 6).
//                  Mas niveles = mejor experiencia al alejar el mapa, pero mas peso.
//   formato: PNG (por defecto, admite bordes transparentes en mosaicos irregulares)
//            o JPEG (mas liviano, sin transparencia — solo si el mosaico es rectangular).
//   maxZoomCap: limita el zoom maximo (por defecto, el detectado segun la resolucion real
//               del archivo, hasta 22). El grueso del peso final sale del nivel de zoom
//               maximo, asi que bajarlo 1-2 niveles reduce el archivo varias veces sin
//               perder la utilidad practica para ver el predio en el navegador.
//
// Requiere Docker corriendo localmente. No sube nada: solo genera el .mbtiles, que
// despues se sube al visor por la API/panel de administracion.

import { execFileSync } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const GDAL_IMAGE = "ghcr.io/osgeo/gdal:alpine-normal-latest";
const WEB_MERCATOR_ORIGIN_RES = 156543.03392804097; // resolucion (m/px) en zoom 0

function toDockerPath(p) {
  return p.replace(/\\/g, "/");
}

function runDocker(mounts, args) {
  const volumeArgs = mounts.flatMap(([host, container]) => ["-v", `${toDockerPath(host)}:${container}`]);
  return execFileSync("docker", ["run", "--rm", ...volumeArgs, GDAL_IMAGE, ...args], {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 64,
  });
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

async function main() {
  const [, , inputArg, outputArg, minZoomOffsetArg, formatArg, maxZoomCapArg] = process.argv;
  if (!inputArg || !outputArg) {
    console.error(
      "Uso: node tools/process-orthophoto.mjs <entrada.tif> <salida.mbtiles> [minZoomOffset=6] [PNG|JPEG]",
    );
    process.exit(1);
  }

  try {
    execFileSync("docker", ["info"], { stdio: "ignore" });
  } catch {
    console.error("Docker no esta corriendo. Inicia Docker Desktop e intenta de nuevo.");
    process.exit(1);
  }

  const minZoomOffset = minZoomOffsetArg ? Number(minZoomOffsetArg) : 6;
  const tileFormat = (formatArg || "PNG").toUpperCase();
  const maxZoomCap = maxZoomCapArg ? Number(maxZoomCapArg) : null;

  const inputAbs = path.resolve(inputArg);
  const outputAbs = path.resolve(outputArg);
  if (!existsSync(inputAbs)) {
    console.error(`No se encontró el archivo de entrada: ${inputAbs}`);
    process.exit(1);
  }

  const inDir = path.dirname(inputAbs);
  const outDir = path.dirname(outputAbs);
  const inName = path.basename(inputAbs);
  const outName = path.basename(outputAbs);
  const tmpWarpedName = `_tmp_warped_${Date.now()}.tif`;
  const mounts = [
    [inDir, "/in"],
    [outDir, "/out"],
  ];

  console.log("Reproyectando a Web Mercator (EPSG:3857) para medir la resolución real...");
  runDocker(mounts, [
    "gdalwarp",
    "-t_srs",
    "EPSG:3857",
    "-r",
    "cubic",
    "-dstalpha",
    `/in/${inName}`,
    `/out/${tmpWarpedName}`,
  ]);

  const infoJson = runDocker(mounts, ["gdalinfo", "-json", `/out/${tmpWarpedName}`]);
  const info = JSON.parse(infoJson);
  const pixelSize = Math.abs(info.geoTransform[1]);

  const detectedMaxZoom = Math.min(22, Math.max(0, Math.round(Math.log2(WEB_MERCATOR_ORIGIN_RES / pixelSize))));
  const maxZoom = maxZoomCap ? Math.min(detectedMaxZoom, maxZoomCap) : detectedMaxZoom;
  const minZoomRequested = Math.max(maxZoom - minZoomOffset, 0);
  const exactRes = WEB_MERCATOR_ORIGIN_RES / 2 ** maxZoom;

  console.log(`Resolución detectada: ${pixelSize.toFixed(3)} m/px → zoom máximo ${detectedMaxZoom}`);
  if (maxZoomCap && maxZoom < detectedMaxZoom) {
    console.log(`Zoom máximo limitado a ${maxZoom} (${(WEB_MERCATOR_ORIGIN_RES / 2 ** maxZoom).toFixed(3)} m/px) por maxZoomCap.`);
  }
  console.log(`Generando .mbtiles (zoom ${minZoomRequested}-${maxZoom}, formato ${tileFormat})...`);

  const outputName = outName.endsWith(".mbtiles") ? outName : `${outName}.mbtiles`;
  const baseName = path.basename(outputName, ".mbtiles");

  runDocker(mounts, [
    "gdalwarp",
    "-t_srs",
    "EPSG:3857",
    "-r",
    "cubic",
    "-dstalpha",
    "-tr",
    String(exactRes),
    String(exactRes),
    "-of",
    "MBTiles",
    "-co",
    `TILE_FORMAT=${tileFormat}`,
    "-co",
    `NAME=${baseName}`,
    `/in/${inName}`,
    `/out/${outputName}`,
  ]);

  console.log("Construyendo pirámide de zoom (niveles alejados)...");
  const factors = [];
  for (let f = 2; f <= 2 ** minZoomOffset; f *= 2) factors.push(String(f));
  runDocker(mounts, ["gdaladdo", `/out/${outputName}`, ...factors]);

  const finalInfoJson = runDocker(mounts, ["gdalinfo", "-json", `/out/${outputName}`]);
  const finalInfo = JSON.parse(finalInfoJson);
  const bandMetadata = finalInfo.bands?.[0]?.metadata?.["IMAGE_STRUCTURE"] ?? {};
  const datasetMd = finalInfo.metadata?.[""] ?? {};
  const [west, south, east, north] = (() => {
    const coords = finalInfo.wgs84Extent.coordinates[0];
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  })();

  try {
    unlinkSync(path.join(outDir, tmpWarpedName));
    unlinkSync(path.join(outDir, `${tmpWarpedName}.aux.xml`));
  } catch {
    // no pasa nada si el temporal ya no existe
  }
  try {
    unlinkSync(`${outputAbs}.aux.xml`);
  } catch {
    // ídem
  }

  const finalSize = statSync(outputAbs.endsWith(".mbtiles") ? outputAbs : `${outputAbs}.mbtiles`).size;

  console.log("");
  console.log("Listo:", outputName);
  console.log("Peso final:", formatBytes(finalSize));
  console.log("Zoom:", `${datasetMd.minzoom ?? minZoomRequested}-${datasetMd.maxzoom ?? maxZoom}`);
  console.log("Bounds (WGS84):", { west, south, east, north });
  console.log("");
  console.log("Usa estos valores (bounds, min/max zoom, peso) al subir la ortofoto desde el panel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
