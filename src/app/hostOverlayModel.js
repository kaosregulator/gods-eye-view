/**
 * Host overlays: map data that the page framing an embedded app hands it.
 *
 * God's Eye View's own layers fetch their own data. A framing page (for
 * example Pueblo Pulse) often already holds data the app has never seen:
 * its users' businesses, events and reports, or a city data hub's results.
 * Instead of teaching the app every host's database, the host sends finished
 * GeoJSON and the app only draws it and reports clicks back. Data retrieval
 * stays with the host; rendering stays here.
 *
 * Messages (all through `postMessage`, accepted only from the framing page):
 *
 *   { type: 'gev:overlay', overlay: { id, label?, color?, features } }
 *       Replace (or create) one overlay. `features` is a GeoJSON
 *       FeatureCollection or an array of Features. Points, lines and
 *       polygons (and their Multi forms) are drawn; other geometry is skipped.
 *   { type: 'gev:overlay-clear', id? }
 *       Remove one overlay, or all of them without an id.
 *   { type: 'gev:fly-to', lat, lon, range_m?, heading_deg?, pitch_deg? }
 *       Fly the camera to look at a point.
 *   { type: 'gev:layer', layerId, enabled }
 *       Switch one of the app's own layers without replacing the whole view.
 *
 * The app answers a click on an overlay feature with
 *   { type: 'gev:overlay-select', overlayId, featureId, name }
 *
 * Pure data and validation only: no Cesium, so node:test can load it.
 */

export const HOST_OVERLAY_MESSAGE = 'gev:overlay';
export const HOST_OVERLAY_CLEAR_MESSAGE = 'gev:overlay-clear';
export const HOST_OVERLAY_SELECT_MESSAGE = 'gev:overlay-select';
export const HOST_FLY_TO_MESSAGE = 'gev:fly-to';
export const HOST_LAYER_MESSAGE = 'gev:layer';

/** Ceilings that keep one bad message from stalling the globe. */
export const HOST_OVERLAY_LIMITS = Object.freeze({
  overlays: 64,
  featuresPerOverlay: 5000,
  verticesPerOverlay: 250_000,
  nameLength: 120,
});

const OVERLAY_ID_PATTERN = /^[a-z0-9][a-z0-9:_.-]{0,63}$/i;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const DEFAULT_COLOR = '#f59e0b';

const finiteLon = (value) =>
  Number.isFinite(value) && value >= -180 && value <= 180;
const finiteLat = (value) =>
  Number.isFinite(value) && value >= -90 && value <= 90;

/** `[lon, lat]` as numbers, or null. Any third (height) value is ignored. */
function position(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = Number(value[0]);
  const lat = Number(value[1]);
  return finiteLon(lon) && finiteLat(lat) ? [lon, lat] : null;
}

/** A line's positions, or null when fewer than two are valid. */
function line(value) {
  if (!Array.isArray(value)) return null;
  const out = [];
  for (const point of value) {
    const p = position(point);
    if (p) out.push(p);
  }
  return out.length >= 2 ? out : null;
}

/** A polygon's outer ring (holes are dropped), or null. */
function ring(value) {
  if (!Array.isArray(value) || !Array.isArray(value[0])) return null;
  const outer = line(value[0]);
  return outer && outer.length >= 3 ? outer : null;
}

/** Flatten one GeoJSON geometry into drawable parts. */
export function geometryParts(geometry) {
  if (!geometry || typeof geometry !== 'object') return [];
  const { type, coordinates } = geometry;
  const parts = [];
  const push = (kind, coords) => coords && parts.push({ kind, coords });
  switch (type) {
    case 'Point':
      push('point', position(coordinates));
      break;
    case 'MultiPoint':
      for (const c of coordinates || []) push('point', position(c));
      break;
    case 'LineString':
      push('line', line(coordinates));
      break;
    case 'MultiLineString':
      for (const c of coordinates || []) push('line', line(c));
      break;
    case 'Polygon':
      push('polygon', ring(coordinates));
      break;
    case 'MultiPolygon':
      for (const c of coordinates || []) push('polygon', ring(c));
      break;
    case 'GeometryCollection':
      for (const g of geometry.geometries || [])
        parts.push(...geometryParts(g));
      break;
    default:
      break;
  }
  return parts;
}

const vertexCount = (part) => (part.kind === 'point' ? 1 : part.coords.length);

/** A short display string, or ''. */
function text(value, max = HOST_OVERLAY_LIMITS.nameLength) {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Validate an overlay message body into the shape the renderer draws.
 * Throws a TypeError naming the problem when the overlay cannot be used;
 * individual bad features are skipped and counted instead.
 */
export function normalizeHostOverlay(overlay) {
  if (!overlay || typeof overlay !== 'object')
    throw new TypeError('Overlay must be an object');
  const id = String(overlay.id ?? '');
  if (!OVERLAY_ID_PATTERN.test(id))
    throw new TypeError('Overlay id must be 1-64 letters, digits, : _ . -');
  const color = COLOR_PATTERN.test(String(overlay.color ?? ''))
    ? String(overlay.color).toLowerCase()
    : DEFAULT_COLOR;
  const raw = Array.isArray(overlay.features)
    ? overlay.features
    : Array.isArray(overlay.features?.features)
      ? overlay.features.features
      : null;
  if (!raw) throw new TypeError('Overlay features must be a list');

  const features = [];
  let skipped = 0;
  let vertices = 0;
  for (let index = 0; index < raw.length; index++) {
    if (features.length >= HOST_OVERLAY_LIMITS.featuresPerOverlay) {
      skipped += raw.length - index;
      break;
    }
    const feature = raw[index];
    const parts = geometryParts(feature?.geometry);
    if (!parts.length) {
      skipped++;
      continue;
    }
    const cost = parts.reduce((sum, part) => sum + vertexCount(part), 0);
    if (vertices + cost > HOST_OVERLAY_LIMITS.verticesPerOverlay) {
      skipped++;
      continue;
    }
    vertices += cost;
    const props = feature.properties || {};
    const featureColor = COLOR_PATTERN.test(String(props.color ?? ''))
      ? String(props.color).toLowerCase()
      : color;
    features.push({
      id: text(feature.id ?? props.id ?? index, 128) || String(index),
      name: text(props.name ?? props.title ?? ''),
      color: featureColor,
      parts,
    });
  }
  return Object.freeze({
    id,
    label: text(overlay.label ?? id),
    color,
    features,
    skipped,
  });
}

/** Validate a fly-to message into camera numbers, or null. */
export function normalizeFlyTo(data) {
  const lat = Number(data?.lat);
  const lon = Number(data?.lon);
  if (!finiteLat(lat) || !finiteLon(lon)) return null;
  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    lat,
    lon,
    rangeM: clamp(data.range_m, 50, 2_000_000, 1500),
    headingDeg: clamp(data.heading_deg, -360, 360, 0),
    pitchDeg: clamp(data.pitch_deg, -90, -5, -45),
  };
}

/** The feature an entity id names: `hostoverlay|<overlay>|<index>`. */
export function hostOverlayEntityId(overlayId, featureIndex, partIndex) {
  return `hostoverlay|${overlayId}|${featureIndex}|${partIndex}`;
}

/** Parse an entity id written by hostOverlayEntityId, or null. */
export function parseHostOverlayEntityId(entityId) {
  const match = /^hostoverlay\|([^|]+)\|(\d+)\|(\d+)$/.exec(String(entityId));
  if (!match) return null;
  return { overlayId: match[1], featureIndex: Number(match[2]) };
}
