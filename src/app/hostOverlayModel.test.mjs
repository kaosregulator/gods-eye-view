import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOST_OVERLAY_LIMITS,
  geometryParts,
  hostOverlayEntityId,
  normalizeFlyTo,
  normalizeHostOverlay,
  parseHostOverlayEntityId,
} from './hostOverlayModel.js';

const point = (lon, lat, properties = {}, id) => ({
  type: 'Feature',
  ...(id === undefined ? {} : { id }),
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties,
});

test('an overlay keeps drawable features and counts the rest', () => {
  const overlay = normalizeHostOverlay({
    id: 'pulse:events',
    label: 'Events',
    color: '#2563EB',
    features: {
      type: 'FeatureCollection',
      features: [
        point(-104.61, 38.27, { name: 'Riverwalk concert' }, 'evt-1'),
        point(500, 38, { name: 'Off the planet' }),
        { type: 'Feature', geometry: null, properties: {} },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-104.6, 38.2],
              [-104.5, 38.3],
            ],
          },
          properties: { title: 'Route 1', color: '#ff0000' },
        },
      ],
    },
  });
  assert.equal(overlay.id, 'pulse:events');
  assert.equal(overlay.color, '#2563eb');
  assert.equal(overlay.features.length, 2);
  assert.equal(overlay.skipped, 2);
  assert.deepEqual(overlay.features[0], {
    id: 'evt-1',
    name: 'Riverwalk concert',
    color: '#2563eb',
    parts: [{ kind: 'point', coords: [-104.61, 38.27] }],
  });
  assert.equal(overlay.features[1].name, 'Route 1');
  assert.equal(overlay.features[1].color, '#ff0000');
});

test('bad overlay ids and missing features are refused', () => {
  assert.throws(() => normalizeHostOverlay({ id: '', features: [] }));
  assert.throws(() => normalizeHostOverlay({ id: 'has space', features: [] }));
  assert.throws(() => normalizeHostOverlay({ id: 'ok' }));
  assert.throws(() => normalizeHostOverlay(null));
});

test('an unusable colour falls back to the default', () => {
  const overlay = normalizeHostOverlay({
    id: 'a',
    color: 'red; background:url(x)',
    features: [],
  });
  assert.equal(overlay.color, '#f59e0b');
});

test('multi geometries split into parts and polygons keep the outer ring', () => {
  const parts = geometryParts({
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
        [
          [0.2, 0.2],
          [0.3, 0.2],
          [0.3, 0.3],
        ],
      ],
      [[[5, 5]]],
    ],
  });
  assert.equal(parts.length, 1);
  assert.equal(parts[0].kind, 'polygon');
  assert.equal(parts[0].coords.length, 4);
});

test('the feature ceiling holds', () => {
  const many = Array.from(
    { length: HOST_OVERLAY_LIMITS.featuresPerOverlay + 5 },
    (_, i) => point(-104 - i / 1e5, 38),
  );
  const overlay = normalizeHostOverlay({ id: 'many', features: many });
  assert.equal(overlay.features.length, HOST_OVERLAY_LIMITS.featuresPerOverlay);
  assert.equal(overlay.skipped, 5);
});

test('long names are shortened for labels', () => {
  const overlay = normalizeHostOverlay({
    id: 'n',
    features: [point(0, 0, { name: 'x'.repeat(500) })],
  });
  assert.equal(overlay.features[0].name.length, HOST_OVERLAY_LIMITS.nameLength);
});

test('fly-to clamps the camera and refuses bad coordinates', () => {
  assert.equal(normalizeFlyTo({ lat: 95, lon: 0 }), null);
  assert.equal(normalizeFlyTo({ lat: 'x', lon: 0 }), null);
  assert.deepEqual(normalizeFlyTo({ lat: 38.27, lon: -104.61 }), {
    lat: 38.27,
    lon: -104.61,
    rangeM: 1500,
    headingDeg: 0,
    pitchDeg: -45,
  });
  assert.equal(normalizeFlyTo({ lat: 1, lon: 1, range_m: 1 }).rangeM, 50);
  assert.equal(normalizeFlyTo({ lat: 1, lon: 1, pitch_deg: 30 }).pitchDeg, -5);
});

test('entity ids round-trip', () => {
  const id = hostOverlayEntityId('pulse:events', 12, 0);
  assert.deepEqual(parseHostOverlayEntityId(id), {
    overlayId: 'pulse:events',
    featureIndex: 12,
  });
  assert.equal(parseHostOverlayEntityId('earthquake:abc'), null);
});
