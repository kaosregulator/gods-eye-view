# Pueblo provider inventory

What God's Eye View already connects to, judged for one job: a live map of
Pueblo, Colorado inside Pueblo Pulse. Written 2026-11-01 from the code,
`DATA_SOURCES.md`, `.env.example` and direct checks of the Pueblo sources.

**How "Working?" was checked.** The build machine for this change could not
reach most outside hosts, so a provider is marked **Verified** only when its
endpoint was fetched and answered with real data on 2026-11-01. **Keyless,
untested here** means the provider needs no key and is covered by the
upstream project's own tests and CI, but nobody has watched it run on the
Pueblo deployment yet. **Needs key** means it does nothing until a key is set.
Re-check every row on the first Railway deploy; the layer panel shows each
layer's live error text.

Freshness words mean exactly this:

- **Live**: updates every few seconds to a minute.
- **Near-live**: updates every few minutes.
- **Periodic**: updates hourly or daily.
- **Scheduled**: computed from a published timetable, not observed.
- **Static**: a dataset that changes rarely.

## Existing God's Eye View providers

| # | Provider | Supplies | Freshness | Key? | Geographic filter | Pueblo? | Limits | Working? | Use in Pueblo Pulse |
|---|---|---|---|---|---|---|---|---|---|
| 1 | NOAA nowCOAST radar (MRMS) | Rain radar tiles | Near-live, ~4 min | No | Tiles by view; CONUS | **Yes** | Fair use | Keyless, untested here | Live Conditions › Radar |
| 2 | NOAA nowCOAST satellite (GOES-19/18) | Cloud imagery | Near-live, ~10 min | No | Tiles by view | **Yes** | Fair use | Keyless, untested here | Live Conditions › Satellite |
| 3 | NOAA nowCOAST lightning | Strike density | Near-live, 15 min | No | Tiles by view | **Yes** | Fair use | Keyless, untested here | Live Conditions › Storms |
| 4 | NOAA GFS / ECMWF IFS | Wind, temperature, pressure | Periodic, 6-hourly model | No | Global grid, drawn by view | **Yes** | Cached 1 h | Keyless, untested here | Live Conditions › Wind, Temperature |
| 5 | Open-Meteo | Current local weather (cockpit) | Near-live | No | Point query | **Yes** | Non-commercial free tier | Keyless, untested here | Weather card; also Pulse hub air quality |
| 6 | NIFC WFIGS | Wildfire perimeters | Periodic | No | ArcGIS query, can take a bbox | **Yes** (fires in region) | Public | Keyless, untested here | Safety › Wildfire |
| 7 | NASA FIRMS | Satellite fire detections | Near-live, ~3 h latency | Map key optional | Bbox | **Yes** | FIRMS limits | Keyless, untested here | Safety › Wildfire |
| 8 | InciWeb | Incident pages | Periodic | No | Linked per incident | **Yes** | Public | Keyless, untested here | Wildfire card links |
| 9 | USGS earthquakes | Quakes, last 24 h | Near-live | No | Global feed (filterable) | Yes, rare locally | Public | Keyless, untested here | Safety › Environment |
| 10 | NASA GIBS + CMR | Recent satellite imagery (HLS, VIIRS) | Periodic, daily | No | Tiles by view | **Yes** | Public | Keyless, untested here | Geographic › Imagery history |
| 11 | OpenSky Network | Live aircraft | Live | Optional OAuth | Bbox | **Yes** (Pueblo Memorial Airport, I-25 corridor) | Non-commercial license, credit limits | Needs key for reliable use | Live Conditions › Air traffic |
| 12 | adsb.lol | Fallback flights, military aircraft, traces | Live | No | Point radius | **Yes** | ODbL | Keyless, untested here | Air traffic |
| 13 | adsbdb | Aircraft type and route lookups | On demand | No | Per aircraft | Yes | None published | Keyless, untested here | Flight cards |
| 14 | CelesTrak | Satellite orbits | Periodic | No | Global | Yes (overhead passes) | Citation | Keyless, untested here | Optional novelty layer |
| 15 | Launch Library 2 | Rocket launches | Periodic | Optional | Global | No local use | Free tier limits | Keyless, untested here | Not planned |
| 16 | AISStream | Ships | Live | **Yes** | Bbox | **No** (no AIS traffic at Lake Pueblo) | Beta | Needs key | Not used |
| 17 | TomTom Traffic | Road congestion | Live | **Yes** | Tiles by view | **Yes** | 200K tiles/month free | Needs key (simulated without one) | Live Conditions › Traffic |
| 18 | OSRM (FOSSGIS) | Routing | On demand | No | Route request | **Yes** | 1 req/s, no heavy use | Keyless, untested here | Directions to a business or event |
| 19 | Photon (komoot) | Place search | On demand | No | Biased to view | **Yes** | Fair use | Keyless, untested here | Map search box |
| 20 | Google Photorealistic 3D Tiles + Places/Geocoding | 3D city, place search | Static imagery | **Yes** | Tiles by view | **Yes** (Pueblo has 3D coverage) | Google pricing | Needs key | Building-level 3D view |
| 21 | Cesium ion | Terrain/imagery alternative | Static | **Yes** | Tiles | Yes | ion plan | Needs key | Optional |
| 22 | Esri World Imagery | Satellite basemap (keyless default) | Static | No | Tiles | **Yes** | Esri terms | Keyless, untested here | Default basemap without Google |
| 23 | OpenFreeMap / OpenStreetMap | Vector streets, buildings, names | Static (frequent edits) | No | Tiles | **Yes** | ODbL | Keyless, untested here | Geographic › Streets, Buildings |
| 24 | Re:Earth / Mapterhorn terrain | Elevation | Static | No | Tiles | **Yes** | CC BY | Keyless, untested here | Terrain for the 3D view |
| 25 | Mapillary | Street-level photos | Periodic | **Yes** | Tiles by view | Partial coverage | Mapillary terms | Needs key | Street imagery |
| 26 | KartaView / Panoramax | Street-level photos | Periodic | No | Tiles by view | Sparse in Pueblo | Fair use | Keyless, untested here | Street imagery fallback |
| 27 | Google Street View | Panoramas | Static | **Yes** | Point | **Yes** | Google pricing | Needs key | Street imagery |
| 28 | OSM ALPR extract | License plate camera locations | Periodic, hourly | No | Global extract | Some in Pueblo | ODbL | Keyless, untested here | Probably leave off by default |
| 29 | Radio Browser | Internet radio stations | Periodic | No | Global, by location | **Yes** (Pueblo stations) | PDDL | Keyless, untested here | Community › Local radio |
| 30 | Google News RSS / GDELT | Regional headlines | Periodic | No | Locality query | **Yes** | Terms of service | Keyless, untested here | Community › Local news |
| 31 | Overpass (self-hosted only) | OSM features | On demand | Your own server | Bbox | Yes | Your server | Off until configured | Parks/facilities fallback |
| 32 | OpenAI Realtime / Gemini Live | Voice control | Live | **Yes** | n/a | Yes | Paid | Needs key | Optional voice assistant |
| 33 | GTFS-Realtime transit (16 regions) | Live bus/train positions | Live | No | Polled near each region | **No Pueblo feed exists** | Per operator | Not applicable | See Pueblo Transit below |
| 34 | GBFS bikeshare | Bike/scooter docks | Live | No | Per system | **No** (no Pueblo system) | Per operator | Not applicable | Not used |
| 35 | CCTV packs (Austin, TxDOT, Caltrans, WSDOT, ...) | Traffic camera stills | Near-live | Mostly no | Per pack | **No** (no Colorado pack) | Per agency | Not applicable | Missing: CDOT cameras |
| 36 | ECCC air quality | AQHI stations | Periodic | No | Canada only | **No** | Open licence | Not applicable | Missing: US air quality |
| 37 | NOAA NHC | Hurricanes | Periodic | No | Atlantic/Pacific | **No** | Public | Not applicable | Not used |
| 38 | TeleGeography cables, datacenters, dams, military names | Static infrastructure | Static | No | Bundled | Dams yes (Pueblo Dam) | Mixed, cables non-commercial | Bundled | Geographic › Infrastructure (dams only) |
| 39 | Local ADS-B / SDR receiver | Your own antenna's aircraft and radio | Live | Hardware | Your antenna | Yes, if installed | n/a | Optional | Could add a Pueblo receiver later |

Nothing here is removed or turned off for Pueblo. The world layers keep working
everywhere; the map simply opens on Pueblo now.

## Pueblo-specific sources

These are new, served through the Pueblo Pulse data hub (`/api/pueblo/*` in
Pueblo Pulse), which caches each one and labels how fresh it is.

| Source | Supplies | Freshness | Key? | Geographic filter | Limits | Working? | Layer |
|---|---|---|---|---|---|---|---|
| Pueblo County GIS, ArcGIS REST (`maps.co.pueblo.co.us/outside/rest/services`) | City limits, municipal boundaries, parcels, address points, zoning, future land use, parks, trails, bike routes, road centerlines, railroads, bridges, bus routes and stops, council districts, floodplains, fire districts, water districts, census tracts, building footprints | Static (edited by county staff) | No | Every layer takes an envelope query and returns GeoJSON | 2,000 records per query | **Verified**: directory, bus routes (26 route segments, 13 routes) and parks layer answered 2026-11-01 | Geographic Information, Public Safety |
| City of Pueblo Open Data hub (`opendata-puebloco.hub.arcgis.com`) | Neighborhoods, address points and other city datasets | Static | No | ArcGIS query | ArcGIS Online limits | Found, not yet wired | Neighborhood boundaries |
| Pueblo Transit GTFS (CDOT / Trillium) | Routes, stops, schedules, route shapes | **Scheduled** | No | One agency | Licence "None" listed | Feed URL confirmed on CDOT's GTFS site 2026-11-01 | Live Conditions › Public transportation |
| Pueblo Transit real-time | Live bus positions | — | — | — | — | **Does not exist** as of 2026-11-01; buses are shown as schedule estimates and labelled so | — |
| National Weather Service (`api.weather.gov`) | Alerts, forecast, current observations (KPUB) | Near-live | No (User-Agent required) | Point or zone (`COZ087`/Pueblo County) | Fair use | Keyless | Live Conditions › Weather, Safety › Alerts |
| USGS Water Data | Arkansas River and Fountain Creek flow and gauge height | Near-live, 15 min | No | Bbox / site list | Fair use | Keyless | Safety › Flood |
| Open-Meteo Air Quality | PM2.5, ozone, US AQI | Periodic, hourly model | No | Point | Non-commercial free tier | Keyless | Live Conditions › Air quality |
| CDOT COtrip | Incidents, closures, construction, road conditions, cameras | Near-live | **Yes** (free key from CDOT) | Statewide feed, filtered to Pueblo area | CDOT terms | Off until `COTRIP_API_KEY` is set | Live Conditions › Road closures, Construction, Traffic cameras |
| US Census API | Population and housing by tract | Static, yearly | Optional | Tract/county | 500 calls/day without key | Not yet wired | Neighborhood profiles |
| The Pueblo Ledger | Inspections, permits, filings, foreclosures | Periodic | — | — | Unofficial; reuse terms unverified | **Held** until reuse terms are confirmed | — |

## Gaps worth filling next

1. **CDOT traffic cameras and incidents.** The CCTV layer already supports camera
   packs; a Colorado pack needs a COtrip key.
2. **US air quality.** GEV's air-quality layer is Canada-only. The hub covers
   Pueblo through Open-Meteo; EPA AirNow (free key) would add official stations.
3. **Live bus positions.** Ask Pueblo Transit whether their buses carry
   AVL/GPS. If a GTFS-Realtime URL ever appears, add one row to
   `src/data/transitFeeds.js` and the live layer takes over from the
   schedule estimates.
