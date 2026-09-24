import { DOMParser } from "@xmldom/xmldom";
import { kml } from "@tmcw/togeojson";
import JSZip from "jszip";
import type { FeatureCollection } from "geojson";
import type { OrthophotoLayer } from "@visor3d/shared";
import { pool } from "../db/pool.js";

interface OrthophotoLayerRow {
  id: string;
  orthophoto_id: string;
  name: string;
  original_filename: string | null;
  geojson: FeatureCollection;
  uploaded_at: string;
}

function mapRow(row: OrthophotoLayerRow): OrthophotoLayer {
  return {
    id: row.id,
    orthophotoId: row.orthophoto_id,
    name: row.name,
    originalFilename: row.original_filename,
    geojson: row.geojson,
    uploadedAt: row.uploaded_at,
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
