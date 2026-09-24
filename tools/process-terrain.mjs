#!/usr/bin/env node
// Convierte un modelo digital de terreno/superficie (DEM/DTM/DSM en GeoTIFF, banda unica
// de elevacion en metros) en un archivo .mbtiles de teselas "terrain-RGB" (codificacion
// Terrarium, la misma que usa MapLibre GL JS de forma nativa) para el terreno 3D del visor
// de ortofotos: la elevacion se codifica en los canales R/G/B de una imagen, se reproyecta
// a Web Mercator, y se genera una piramide de zoom -- todo corriendo GDAL dentro de un
// contenedor Docker desechable (no requiere instalar GDAL en la maquina local).
//
// Uso:
//   node tools/process-terrain.mjs <entrada.tif> <salida.mbtiles> [minZoomOffset]
//
//   minZoomOffset: cuantos niveles de zoom generar por debajo del maximo (default 6).
//
// Requiere Docker corriendo localmente. No sube nada: solo genera el .mbtiles, que
// despues se sube desde el panel "Ortofoto" > "Terreno 3D" del visor.
//
// Nota tecnica: el area fuera de la huella real del DEM (las esquinas del rectangulo que
// quedan fuera del area realmente sobrevolada) decodifica a una elevacion de referencia de
// 0 m en vez de quedar "vacia" -- en la practica no se nota porque esas mismas esquinas ya
// quedan transparentes en la ortofoto que se dibuja encima.

import { execFileSync } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const GDAL_IMAGE = "ghcr.io/osgeo/gdal:alpine-normal-latest";
const WEB_MERCATOR_ORIGIN_RES = 156543.03392804097; // resolucion (m/px) en zoom 0
const ELEVATION_OFFSET = 32768; // Terrarium: height = (R*256 + G + B/256) - 32768

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
  const [, , inputArg, outputArg, minZoomOffsetArg] = process.argv;
  if (!inputArg || !outputArg) {
    console.error("Uso: node tools/process-terrain.mjs <entrada.tif> <salida.mbtiles> [minZoomOffset=6]");
    process.exit(1);
  }

  try {
    execFileSync("docker", ["info"], { stdio: "ignore" });
  } catch {
    console.error("Docker no esta corriendo. Inicia Docker Desktop e intenta de nuevo.");
    process.exit(1);
  }

  const minZoomOffset = minZoomOffsetArg ? Number(minZoomOffsetArg) : 6;

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
  const stamp = Date.now();
  const tmpProbeName = `_tmp_dem_probe_${stamp}.tif`;
  const tmpExactName = `_tmp_dem_exact_${stamp}.tif`;
  const tmpRName = `_tmp_r_${stamp}.tif`;
  const tmpGName = `_tmp_g_${stamp}.tif`;
  const tmpBName = `_tmp_b_${stamp}.tif`;
  const tmpVrtName = `_tmp_rgb_${stamp}.vrt`;
  const mounts = [
    [inDir, "/in"],
    [outDir, "/out"],
  ];

  console.log("Reproyectando a Web Mercator (EPSG:3857) para medir la resolución real...");
  // -dstnodata 0: si el DEM trae huecos (zonas sin dato, comunes en los bordes del vuelo),
  // que decodifiquen a elevacion 0 en vez de arrastrar el valor de nodata original (p.ej.
  // -32767), que codificaria como una elevacion absurda en vez de "sin dato".
  runDocker(mounts, ["gdalwarp", "-t_srs", "EPSG:3857", "-r", "bilinear", "-dstnodata", "0", `/in/${inName}`, `/out/${tmpProbeName}`]);

  const infoJson = runDocker(mounts, ["gdalinfo", "-json", `/out/${tmpProbeName}`]);
  const info = JSON.parse(infoJson);
  const pixelSize = Math.abs(info.geoTransform[1]);

  const maxZoom = Math.min(22, Math.max(0, Math.round(Math.log2(WEB_MERCATOR_ORIGIN_RES / pixelSize))));
  const minZoomRequested = Math.max(maxZoom - minZoomOffset, 0);
  const exactRes = WEB_MERCATOR_ORIGIN_RES / 2 ** maxZoom;

  console.log(`Resolución detectada: ${pixelSize.toFixed(3)} m/px → zoom máximo ${maxZoom}`);

  // Se remuestrea a la resolucion EXACTA del zoom elegido antes de codificar a RGB: si se
  // dejara que gdal_translate ajuste el tamaño mas adelante, usaria un remuestreo (no
  // "vecino mas cercano") que MEZCLARIA bytes de elevaciones distintas y corromperia la
  // codificacion (validado manualmente antes de escribir este script).
  console.log("Remuestreando a la resolución exacta del zoom elegido...");
  runDocker(mounts, [
    "gdalwarp",
    "-t_srs",
    "EPSG:3857",
    "-r",
    "bilinear",
    "-tr",
    String(exactRes),
    String(exactRes),
    "-dstnodata",
    "0",
    "-overwrite",
    `/in/${inName}`,
    `/out/${tmpExactName}`,
  ]);

  // gdal_calc.py enmascara los pixeles marcados como NoData (los que -dstnodata dejo en
  // 0 arriba) y en vez de hacer la aritmetica normal sobre ese 0, rellena la salida con un
  // valor "por defecto" que termina decodificando como una elevacion absurda (~32768 m).
  // Se quita la etiqueta de NoData para que los trate como numeros comunes.
  runDocker(mounts, ["gdal_edit.py", "-unsetnodata", `/out/${tmpExactName}`]);

  console.log("Codificando la elevación en RGB (Terrarium)...");
  runDocker(mounts, [
    "gdal_calc.py",
    "-A",
    `/out/${tmpExactName}`,
    `--outfile=/out/${tmpRName}`,
    "--type=Byte",
    "--overwrite",
    `--calc=(A + ${ELEVATION_OFFSET}) // 256 % 256`,
  ]);
  runDocker(mounts, [
    "gdal_calc.py",
    "-A",
    `/out/${tmpExactName}`,
    `--outfile=/out/${tmpGName}`,
    "--type=Byte",
    "--overwrite",
    `--calc=(A + ${ELEVATION_OFFSET}) // 1 % 256`,
  ]);
  runDocker(mounts, [
    "gdal_calc.py",
    "-A",
    `/out/${tmpExactName}`,
    `--outfile=/out/${tmpBName}`,
    "--type=Byte",
    "--overwrite",
    `--calc=((A + ${ELEVATION_OFFSET}) % 1) * 256 // 1`,
  ]);

  runDocker(mounts, [
    "gdalbuildvrt",
    "-separate",
    "-overwrite",
    `/out/${tmpVrtName}`,
    `/out/${tmpRName}`,
    `/out/${tmpGName}`,
    `/out/${tmpBName}`,
  ]);

  console.log(`Generando .mbtiles (zoom ${minZoomRequested}-${maxZoom})...`);
  const outputName = outName.endsWith(".mbtiles") ? outName : `${outName}.mbtiles`;
  const baseName = path.basename(outputName, ".mbtiles");

  runDocker(mounts, [
    "gdal_translate",
    "-of",
    "MBTiles",
    "-r",
    "near",
    "-co",
    `TILE_FORMAT=PNG`,
    "-co",
    `NAME=${baseName}`,
    `/out/${tmpVrtName}`,
    `/out/${outputName}`,
  ]);

  console.log("Construyendo pirámide de zoom (niveles alejados)...");
  const factors = [];
  for (let f = 2; f <= 2 ** minZoomOffset; f *= 2) factors.push(String(f));
  if (factors.length > 0) {
    // "nearest" es obligatorio aqui por la misma razon que arriba: promediar bytes de
    // elevaciones codificadas produce elevaciones inventadas, no un promedio valido.
    runDocker(mounts, ["gdaladdo", "-r", "nearest", `/out/${outputName}`, ...factors]);
  }

  const finalInfoJson = runDocker(mounts, ["gdalinfo", "-json", `/out/${outputName}`]);
  const finalInfo = JSON.parse(finalInfoJson);
  const datasetMd = finalInfo.metadata?.[""] ?? {};
  const [west, south, east, north] = (() => {
    const coords = finalInfo.wgs84Extent.coordinates[0];
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  })();

  for (const name of [
    tmpProbeName,
    `${tmpProbeName}.aux.xml`,
    tmpExactName,
    `${tmpExactName}.aux.xml`,
    tmpRName,
    tmpGName,
    tmpBName,
    tmpVrtName,
  ]) {
    try {
      unlinkSync(path.join(outDir, name));
    } catch {
      // no pasa nada si el temporal ya no existe
    }
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
  console.log("Usa estos valores (bounds, min/max zoom) al subir el terreno desde el panel de la ortofoto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
