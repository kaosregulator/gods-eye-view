/**
 * Draw host overlays (see hostOverlayModel.js) on the globe and report clicks.
 * Features carry no world-text labels (the app keeps all world text in its
 * overlay host); the framing page names the clicked feature in its own UI.
 */
import * as Cesium from 'cesium';
import {
  HOST_OVERLAY_LIMITS,
  hostOverlayEntityId,
  normalizeHostOverlay,
  parseHostOverlayEntityId,
} from './hostOverlayModel.js';

/**
 * Own the host overlays of one viewer. `onSelect({ overlayId, featureId,
 * name })` runs when the user clicks an overlay feature.
 */
export function createHostOverlays({ viewer, onSelect, requestRender }) {
  const overlays = new Map();
  const render = () => {
    if (typeof requestRender === 'function') requestRender('host-overlay');
    else viewer.scene?.requestRender?.();
  };

  const draw = (overlay) => {
    const source = new Cesium.CustomDataSource(`host-overlay:${overlay.id}`);
    overlay.features.forEach((feature, featureIndex) => {
      const color = Cesium.Color.fromCssColorString(feature.color);
      feature.parts.forEach((part, partIndex) => {
        const id = hostOverlayEntityId(overlay.id, featureIndex, partIndex);
        if (part.kind === 'point') {
          const [lon, lat] = part.coords;
          source.entities.add({
            id,
            name: feature.name,
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            point: {
              pixelSize: 11,
              color,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        } else if (part.kind === 'line') {
          source.entities.add({
            id,
            name: feature.name,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray(part.coords.flat()),
              width: 4,
              material: color.withAlpha(0.9),
              clampToGround: true,
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });
        } else {
          const positions = Cesium.Cartesian3.fromDegreesArray(
            part.coords.flat(),
          );
          source.entities.add({
            id,
            name: feature.name,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: color.withAlpha(0.22),
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });
          // Clamped polygons cannot draw an outline; a clamped line can.
          source.entities.add({
            id: `${id}|edge`,
            polyline: {
              positions: [...positions, positions[0]],
              width: 2,
              material: color.withAlpha(0.85),
              clampToGround: true,
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });
        }
      });
    });
    return source;
  };

  const remove = (id) => {
    const entry = overlays.get(id);
    if (!entry) return;
    overlays.delete(id);
    viewer.dataSources.remove(entry.source, true);
  };

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    const entityId = picked?.id?.id;
    const parsed = parseHostOverlayEntityId(
      String(entityId ?? '').replace(/\|edge$/, ''),
    );
    if (!parsed) return;
    const entry = overlays.get(parsed.overlayId);
    const feature = entry?.overlay.features[parsed.featureIndex];
    if (!feature) return;
    onSelect?.({
      overlayId: parsed.overlayId,
      featureId: feature.id,
      name: feature.name,
    });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return {
    /** Replace or create one overlay. Returns a summary for the host. */
    set(raw) {
      const overlay = normalizeHostOverlay(raw);
      if (
        !overlays.has(overlay.id) &&
        overlays.size >= HOST_OVERLAY_LIMITS.overlays
      )
        throw new RangeError('Too many overlays');
      const source = draw(overlay);
      remove(overlay.id);
      viewer.dataSources.add(source);
      overlays.set(overlay.id, { overlay, source });
      render();
      return {
        overlayId: overlay.id,
        drawn: overlay.features.length,
        skipped: overlay.skipped,
      };
    },
    /** Remove one overlay, or every overlay without an id. */
    clear(id) {
      if (id) remove(String(id));
      else for (const key of [...overlays.keys()]) remove(key);
      render();
    },
    ids: () => [...overlays.keys()],
    destroy() {
      handler.destroy();
      for (const key of [...overlays.keys()]) remove(key);
    },
  };
}
