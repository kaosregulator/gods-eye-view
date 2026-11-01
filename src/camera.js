import * as Cesium from 'cesium';
import { CITY_POIS } from './cityPois.js';

/**
 * Where the app opens when no share link names a view. Each home looks over
 * its whole city: high enough to see every neighbourhood, angled so streets
 * and terrain read, and close enough that a scroll reaches street level.
 * `lat`/`lon`/`height` place the camera itself (height above the WGS84
 * ellipsoid), not the point it looks at.
 */
export const HOME_VIEWS = Object.freeze({
  pueblo: Object.freeze({
    city: 'pueblo',
    lat: 38.2,
    lon: -104.612,
    height: 9000,
    heading: 0,
    pitch: -45,
  }),
  austin: Object.freeze({
    city: 'austin',
    lat: 30.2672,
    lon: -97.7431,
    height: 600,
    heading: 15,
    pitch: -30,
  }),
});

export const DEFAULT_HOME = 'pueblo';

/**
 * The home view the build names (`VITE_GEV_HOME_CITY`), falling back to
 * Pueblo. Any other city remains one click away in location navigation.
 */
export function resolveHomeView(name = viteHomeCity()) {
  const key = String(name || '')
    .trim()
    .toLowerCase();
  return HOME_VIEWS[key] || HOME_VIEWS[DEFAULT_HOME];
}

function viteHomeCity() {
  try {
    return import.meta.env?.VITE_GEV_HOME_CITY;
  } catch {
    return undefined;
  }
}

/** The display name of a home view's city. */
export function homeCityName(home = resolveHomeView()) {
  return CITY_POIS[home.city]?.name || home.city;
}

/**
 * Set the camera over a home city on load, with a cinematic fly-in.
 * @returns {Function} Cancels the pending or active startup flight.
 */
export function flyToHome(viewer, home = resolveHomeView()) {
  // Start straight above, high, then descend into the home framing.
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      home.lon,
      home.lat,
      Math.max(home.height * 3, 25000),
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });

  const timer = setTimeout(() => {
    if (viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        home.lon,
        home.lat,
        home.height,
      ),
      orientation: {
        heading: Cesium.Math.toRadians(home.heading),
        pitch: Cesium.Math.toRadians(home.pitch),
        roll: 0.0,
      },
      duration: 4.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 500);
  return () => {
    clearTimeout(timer);
    if (!viewer.isDestroyed()) viewer.camera.cancelFlight();
  };
}

/** The original Austin landing, kept for callers that ask for it by name. */
export function flyToAustin(viewer) {
  return flyToHome(viewer, HOME_VIEWS.austin);
}
