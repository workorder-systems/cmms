# Locations map improvements: draw, search, configure

**Date:** 2025-03-12  
**Scope:** Dashboard → Locations → Map

## Current state

- **Map page** (`_protected.dashboard.locations.map.tsx`): Leaflet map with tile layer, zoom, fullscreen, locate, and **place search** (MapSearchControl / Photon). No markers, no drawing, no location configuration.
- **UI map** (`packages/ui/components/map.tsx`): Already provides **drawing** (MapDrawControl, MapDrawMarker, MapDrawPolyline, MapDrawCircle, MapDrawRectangle, MapDrawPolygon, MapDrawEdit, MapDrawDelete, MapDrawUndo) and **search** (MapSearchControl). Not used on the locations map.
- **Locations**: `app.locations` has no latitude/longitude. Fields: name, description, parent_location_id, location_type, code, address_line, external_id. So locations cannot be shown or positioned on the map today.

## Goals

1. **Draw on the map** – Polygons, polylines, circles, rectangles, markers; optional edit/delete/undo.
2. **Search** – Keep place search; add **location search** (filter tenant locations, fly to one if it has coordinates).
3. **Configure locations** – Set or edit location position (lat/lng) from the map; show location markers; quick-edit name/type/address from a popup or sidebar.

## Design

### 1. Drawing on the map

- **Use existing UI:** Add `MapLayers` (if we want a layers panel), `MapDrawControl`, and the draw buttons (marker, polyline, circle, rectangle, polygon, edit, delete, undo) from `packages/ui` to the locations map page. No new backend required for a first version.
- **Persistence (optional):**
  - **Option A – In-memory only:** Drawings exist for the session; refresh clears them. Easiest.
  - **Option B – Attach to location:** When a shape is drawn, user can “Link to location” and we store the geometry (e.g. polygon as JSONB or PostGIS) on the location or on a new `location_footprints` table. Requires schema + RPCs.
  - **Option C – Standalone “map layers”:** New table for drawn layers (tenant_id, name, geometry, style). Good for overlays (e.g. “Delivery zone”) that are not a single location.
- **Recommendation:** Ship **Option A** first (drawing only, no persistence). Add Option B or C later if users need saved shapes or location footprints.

### 2. Search

- **Place search (current):** Keep MapSearchControl. Improve UX: on “Select” of a place result, **fly map to** that point (and optionally set a “pending” marker). If we add “Set as location position” (see below), we can pre-fill address from the place result.
- **Location search:** Add a second control or combined search:
  - **Location search:** Combobox that searches tenant locations by name/code (use existing `client.locations.list()` and filter or add a small search API). List shows name, code, type.
  - **Action when a location is chosen:** If the location has lat/lng, **fly map to** that point and highlight its marker. If it has no coordinates, show a message “No position set – set on map” and optionally focus the “Set position” flow.
- **Recommendation:** Implement both: (1) fly-to and optional “set position” from place search; (2) location search combobox that flies to the selected location when it has coordinates.

### 3. Configure locations (requires coordinates in the schema)

- **Schema:** Add to `app.locations`:
  - `latitude numeric(10, 7)` (nullable)
  - `longitude numeric(10, 7)` (nullable)  
  Constrain: if one is set, both must be set; valid ranges lat [-90, 90], lng [-180, 180]. Alternatively use PostGIS `geography(Point)` – same idea, one column.
- **Views and RPCs:** Add `latitude` and `longitude` to `public.v_locations`. Extend `rpc_create_location` and `rpc_update_location` with `p_latitude` / `p_longitude` (nullable). Update SDK `CreateLocationParams` / `UpdateLocationParams` and types.
- **Map behavior:**
  - **Markers:** For each location that has `latitude` and `longitude`, show a `MapMarker` (or cluster if many). Popup: name, type, code, “Edit” link to hierarchy/edit modal or inline fields (name, type, address, “Remove position”).
  - **Set position:** Two flows:
    - **From list:** User selects a location (e.g. from location search or a sidebar list). Clicks “Set on map”. Map enters “click to set position” mode; one click sets lat/lng and calls `client.locations.update({ …, latitude, longitude })`.
    - **From place search:** User searches a place, selects it (map flies there). Clicks “Set as position for [Location X]” (location chosen from dropdown) and we save that lat/lng (and optionally address_line) for that location.
- **Centering:** If at least one location has coordinates, consider centering the initial map view on their bounds; otherwise keep current default center.

### 4. UI layout (map page)

- **Header:** Title “Map”, short description, optional “Layers” dropdown (if we use MapLayers for tile + overlay toggles).
- **Toolbar / controls:** Group controls to avoid clutter:
  - **Left:** Place search (existing) + **Location search** (combobox).
  - **Right:** Zoom, fullscreen, locate.
  - **Bottom-left:** Draw toolbar (MapDrawControl + draw buttons + edit/delete/undo) when “Drawing” is enabled (or always visible if preferred).
- **Side panel (optional):** “Locations” list (filterable) with “Set on map” and “Fly to” for each; or integrate “Set position” into a small modal/sheet.
- **Map:** Full area; markers for locations with coords; drawn shapes in a FeatureGroup (session-only unless we add persistence).

### 5. Implementation order

1. **Phase 1 – Drawing and search UX (no schema change)**
  - Add MapDrawControl and draw buttons to the locations map page.
  - Ensure place search result flies the map to the selected point (and optionally shows a temporary marker).
  - Add location search combobox (filter `locations.list()` by name/code); when user picks a location that has no coordinates, show “No position set” and do not move the map (or center on default).
2. **Phase 2 – Store and use coordinates**
  - Migration: add `latitude` and `longitude` to `app.locations`; update `v_locations` and RPCs; update SDK types and create/update params.
  - Map: render markers for locations with lat/lng; popup with name, type, “Edit” (navigate to hierarchy or open edit sheet).
  - “Set position” flow: select location → “Set on map” → click map → save via `locations.update`.
  - Location search: when user selects a location with coordinates, fly to it and highlight marker.
  - Optional: when creating/editing a location in the hierarchy, allow setting lat/lng (e.g. “Set from map” button that opens map in a modal).
3. **Phase 3 – Polish**
  - Initial map center/bounds from location markers when available.
  - Optional: persist drawn shapes (e.g. link polygon to location as “footprint” or store in a map_layers table).

## Out of scope (for later)

- PostGIS and spatial queries (e.g. “locations within 5 km”).
- Multiple shapes per location (e.g. multiple polygons).
- Import/export of drawn shapes (GeoJSON).

## Summary

- **Drawing:** Add existing MapDrawControl + draw tools to the map page; keep drawings session-only for now.
- **Search:** Keep place search; add location search that flies to the selected location when it has coordinates; make place search fly to the selected place.
- **Configure:** Add `latitude`/`longitude` to locations, then show markers, popup edit, and “Set on map” flow so users can set or change location position from the map.

