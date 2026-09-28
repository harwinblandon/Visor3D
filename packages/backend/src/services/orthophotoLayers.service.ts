import { DOMParser } from "@xmldom/xmldom";
import { kml } from "@tmcw/togeojson";
import JSZip from "jszip";
import proj4 from "proj4";
import { read as readShapefile } from "shapefile";
import type { FeatureCollection, Geometry, Position } from "geojson";
import type { OrthophotoLayer } from "@h-geovisor/shared";
import { pool } from "../db/pool.js";

interface OrthophotoLayerRow {
  id: string;
  orthophoto_id: string;
  name: string;
  original_filename: string | null;
  geojson: FeatureCollection;
  uploaded_at: string;
  color: string | null;
  line_width: number;
  fill_opacity: number;
  label_field: string | null;
}

function mapRow(row: OrthophotoLayerRow): OrthophotoLayer {
  return {
    id: row.id,
    orthophotoId: row.orthophoto_id,
    name: row.name,
    originalFilename: row.original_filename,
    geojson: row.geojson,
    uploadedAt: row.uploaded_at,
    color: row.color,
    lineWidth: row.line_width,
    fillOpacity: row.fill_opacity,
    labelField: row.label_field,
  };
}

/** Convierte un .kml o .kmz (buffer crudo) a GeoJSON. KMZ es un .zip con un .kml adentro. */
export async function parseKmlOrKmz(buffer: Buffer, originalFilename: string): Promise<FeatureCollection> {
  const isKmz = originalFilename.toLowerCase().endsWith(".kmz");
  let kmlText: string;

  if (isKmz) {
    const zip = await JSZip.loadAsync(buffer);
    const kmlEntry = Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(".kml"));
    if (!kmlEntry) throw new Error("El archivo .kmz no contiene ningún .kml");
    kmlText = await kmlEntry.async("text");
  } else {
    kmlText = buffer.toString("utf-8");
  }

  // Muchos exportadores (Google Earth, QGIS, Civil3D en Windows) anteponen un BOM UTF-8;
  // eso deja un caracter invisible antes de "<?xml ...?>" y el parser lo rechaza porque
  // ya no ve la declaracion XML al inicio literal del documento. trim() lo quita (U+FEFF
  // cuenta como whitespace para el motor de JS) junto con cualquier salto de linea previo.
  kmlText = kmlText.trim();

  const dom = new DOMParser().parseFromString(kmlText, "text/xml");
  const geojson = kml(dom as unknown as Document, { skipNullGeometry: true }) as FeatureCollection;
  if (!geojson.features || geojson.features.length === 0) {
    throw new Error("El archivo no contiene figuras (placemarks) reconocibles");
  }
  return geojson;
}

function transformCoordinates(coords: unknown, project: (p: Position) => Position): unknown {
  if (Array.isArray(coords) && typeof coords[0] === "number") {
    return project(coords as Position);
  }
  return (coords as unknown[]).map((c) => transformCoordinates(c, project));
}

/**
 * Reproyecta las geometrias de un FeatureCollection a WGS84 (lng/lat) usando la definicion
 * de proyeccion (WKT, tal como viene en el .prj de un shapefile) del CRS de origen. Si el
 * .prj ya esta en WGS84, proj4 hace una transformacion practicamente nula. Se valida que el
 * resultado caiga en un rango de coordenadas geograficas valido para detectar una proyeccion
 * mal interpretada en vez de dejar pasar datos silenciosamente corruptos (mismo tipo de
 * aviso de compatibilidad de CRS que ya se ve al procesar GeoTIFFs con gdalwarp).
 */
function reprojectToWgs84(geojson: FeatureCollection, wkt: string): void {
  let project: (p: Position) => Position;
  try {
    // proj4(from) a secas transforma DE WGS84 HACIA esa proyeccion (forward va "hacia
    // adelante" desde WGS84, no al reves) -- aqui se necesita lo contrario, asi que se pasa
    // el destino explicito para que forward() vaya en la direccion correcta.
    const converter = proj4(wkt.trim(), "WGS84");
    project = (p) => converter.forward(p) as Position;
  } catch {
    throw new Error(
      "No se pudo interpretar la proyección del archivo .prj. Reproyecta el shapefile a WGS84 (EPSG:4326) antes de subirlo.",
    );
  }

  for (const feature of geojson.features) {
    const geometry = feature.geometry as Geometry & { coordinates?: unknown };
    if (geometry && "coordinates" in geometry) {
      geometry.coordinates = transformCoordinates(geometry.coordinates, project) as never;
    }
  }

  for (const feature of geojson.features) {
    const geometry = feature.geometry as Geometry & { coordinates?: unknown };
    if (!geometry || !("coordinates" in geometry)) continue;
    const flat = JSON.stringify(geometry.coordinates).match(/-?\d+(\.\d+)?/g) ?? [];
    for (let i = 0; i < flat.length; i += 2) {
      const lon = Number(flat[i]);
      const lat = Number(flat[i + 1]);
      if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
        throw new Error(
          "La proyección del .prj no se pudo convertir correctamente a coordenadas geográficas (valores fuera de rango). Reproyecta el shapefile a WGS84 (EPSG:4326) antes de subirlo.",
        );
      }
    }
  }
}

/** Convierte un shapefile (.zip con .shp + .dbf + .shx, opcionalmente .prj) a GeoJSON en WGS84. */
export async function parseShapefile(buffer: Buffer, _originalFilename: string): Promise<FeatureCollection> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("El archivo debe ser un .zip que contenga el .shp junto con su .dbf y .shx");
  }

  const findEntry = (ext: string) => Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(ext));

  const shpEntry = findEntry(".shp");
  if (!shpEntry) throw new Error("El .zip no contiene ningún archivo .shp");
  const dbfEntry = findEntry(".dbf");
  const prjEntry = findEntry(".prj");

  const shpBuffer = Buffer.from(await shpEntry.async("arraybuffer"));
  const dbfBuffer = dbfEntry ? Buffer.from(await dbfEntry.async("arraybuffer")) : undefined;

  const geojson = await readShapefile(shpBuffer, dbfBuffer);

  if (prjEntry) {
    const wkt = await prjEntry.async("text");
    reprojectToWgs84(geojson, wkt);
  }

  if (!geojson.features || geojson.features.length === 0) {
    throw new Error("El shapefile no contiene figuras reconocibles");
  }
  return geojson;
}

export async function createLayer(input: {
  orthophotoId: string;
  name: string;
  originalFilename: string | null;
  geojson: FeatureCollection;
}): Promise<OrthophotoLayer> {
  const { rows } = await pool.query<OrthophotoLayerRow>(
    `INSERT INTO orthophoto_layers (orthophoto_id, name, original_filename, geojson)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.orthophotoId, input.name, input.originalFilename, JSON.stringify(input.geojson)],
  );
  return mapRow(rows[0]);
}

export interface UpdateLayerStyleInput {
  name?: string;
  color?: string | null;
  lineWidth?: number;
  fillOpacity?: number;
  labelField?: string | null;
}

export async function updateLayerStyle(id: string, patch: UpdateLayerStyleInput): Promise<OrthophotoLayer | null> {
  const { rows: currentRows } = await pool.query<OrthophotoLayerRow>("SELECT * FROM orthophoto_layers WHERE id = $1", [id]);
  const current = currentRows[0];
  if (!current) return null;

  const name = patch.name !== undefined ? patch.name : current.name;
  const color = patch.color !== undefined ? patch.color : current.color;
  const lineWidth = patch.lineWidth !== undefined ? patch.lineWidth : current.line_width;
  const fillOpacity = patch.fillOpacity !== undefined ? patch.fillOpacity : current.fill_opacity;
  const labelField = patch.labelField !== undefined ? patch.labelField : current.label_field;

  const { rows } = await pool.query<OrthophotoLayerRow>(
    "UPDATE orthophoto_layers SET name = $2, color = $3, line_width = $4, fill_opacity = $5, label_field = $6 WHERE id = $1 RETURNING *",
    [id, name, color, lineWidth, fillOpacity, labelField],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listLayers(orthophotoId: string): Promise<OrthophotoLayer[]> {
  const { rows } = await pool.query<OrthophotoLayerRow>(
    "SELECT * FROM orthophoto_layers WHERE orthophoto_id = $1 ORDER BY uploaded_at ASC",
    [orthophotoId],
  );
  return rows.map(mapRow);
}

export async function deleteLayer(id: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM orthophoto_layers WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}
