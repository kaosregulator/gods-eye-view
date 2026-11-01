# Pueblo Pulse integration

This fork of God's Eye View is the map engine inside
[Pueblo Pulse](https://github.com/kaosregulator/Pueblo-pulse-beta). The engine
stays the same; three things changed:

1. **It opens on Pueblo, Colorado.** The startup flight lands over the whole
   city, looking north from just south of downtown. Pueblo is also the first
   destination in location navigation, with the Riverwalk, Union Depot,
   Mineral Palace Park, the State Fairgrounds and Pueblo Dam as landmarks.
   Every other city and the whole globe are still there. Set
   `VITE_GEV_HOME_CITY=austin` to restore the original landing.
2. **Host overlays.** The page that embeds the app can hand it GeoJSON to draw
   and hears back when someone clicks a feature. Pueblo Pulse uses this for
   its businesses, events, lost and found, alerts and its Pueblo data hub.
3. **Host layer switches.** The embedding page can turn the app's own layers
   (radar, wind, fires, flights, ...) on and off one at a time.

See [PUEBLO-PROVIDER-INVENTORY.md](./PUEBLO-PROVIDER-INVENTORY.md) for every
provider and what it does for Pueblo.

## Embed protocol

Load the app in a frame at `https://<gev-host>/?embed=1`. Wait for
`{ type: 'gev:ready' }`, then post any of these to the frame:

```js
frame.contentWindow.postMessage(
  {
    type: 'gev:overlay',
    id: 1, // echoed in the answer
    overlay: {
      id: 'pulse:events', // letters, digits, : _ . - (max 64)
      label: 'Events',
      color: '#2563eb', // #rrggbb; a feature's properties.color overrides it
      features: featureCollection, // GeoJSON FeatureCollection or Feature[]
    },
  },
  gevOrigin,
);
// answer: { type: 'gev:overlay-applied', id: 1, ok, overlayId, drawn, skipped }

frame.contentWindow.postMessage({ type: 'gev:overlay-clear', overlayId: 'pulse:events' }, gevOrigin);
frame.contentWindow.postMessage({ type: 'gev:fly-to', lat: 38.2647, lon: -104.6106, range_m: 900 }, gevOrigin);
frame.contentWindow.postMessage({ type: 'gev:layer', layerId: 'weather-radar', enabled: true }, gevOrigin);
```

When someone clicks an overlay feature the app posts to the parent:

```js
{ type: 'gev:overlay-select', overlayId: 'pulse:events', featureId: 'evt-1', name: 'Riverwalk concert' }
```

Features use `feature.id` (or `properties.id`) as their id and
`properties.name` (or `properties.title`) as their name. Limits: 64 overlays,
5,000 features and 250,000 vertices per overlay. Messages are accepted only
from the framing page, and only pages listed in `GEV_EMBED_FRAME_ANCESTORS`
may frame the app at all.

## Deploying on Railway

The repository's `Dockerfile` runs as-is; `railway.json` points Railway at it.
Set these variables on the God's Eye View service:

| Variable | Value |
|---|---|
| `GEV_ALLOWED_HOSTS` | The service's public domain, e.g. `gev-production.up.railway.app` |
| `GEV_EMBED_FRAME_ANCESTORS` | The Pueblo Pulse domain, e.g. `https://pueblo-pulse.up.railway.app` |
| `VITE_GEV_HOME_CITY` | `pueblo` (the default) |
| Optional keys | `GOOGLE_MAPS_API_KEY` (3D city), `TOMTOM_API_KEY` (live traffic), `OPENSKY_CLIENT_ID`/`OPENSKY_CLIENT_SECRET` (flights), `MAPILLARY_CLIENT_TOKEN` (street photos) |

Railway sets `PORT` itself. Without any keys the app still runs on keyless
providers: Esri imagery, OpenStreetMap, radar, satellite, wind, fires,
earthquakes and place search.
