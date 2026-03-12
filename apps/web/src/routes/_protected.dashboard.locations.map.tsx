import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LocationRow, MapZoneRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import {
  Map as MapComponent,
  MapTileLayer,
  MapZoomControl,
  MapFullscreenControl,
  MapLocateControl,
  MapControlContainer,
  MapMarker,
  MapPopup,
  MapDrawControl,
  MapDrawMarker,
  MapDrawPolyline,
  MapDrawCircle,
  MapDrawRectangle,
  MapDrawPolygon,
  MapDrawEdit,
  MapDrawDelete,
  MapDrawUndo,
  useMap,
  useMapEvents,
  useLeaflet,
} from '@workspace/ui/components/map'
import { PlaceAutocomplete } from '@workspace/ui/components/place-autocomplete'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLocationsPageStore } from '../stores/locations-page'

/** Default center when no location coordinates exist. */
const DEFAULT_CENTER: [number, number] = [52.3676, 4.9041]

/** Convert a Leaflet draw layer to GeoJSON geometry (for saving). */
function layerToGeoJSONGeometry(layer: unknown): Record<string, unknown> | null {
  const L = layer as {
    toGeoJSON?: () => { geometry?: Record<string, unknown> }
    getLatLngs?: () => { lat: number; lng: number }[] | { lat: number; lng: number }[][]
    getLatLng?: () => { lat: number; lng: number }
    getBounds?: () => { getSouthWest: () => { lat: number; lng: number }; getNorthEast: () => { lat: number; lng: number } }
    getRadius?: () => number
  }
  /* Circle first: Leaflet's toGeoJSON() returns Point for circles; we want Polygon so it renders as shape */
  if (L.getLatLng && typeof L.getRadius === 'function') {
    const ll = L.getLatLng()
    const radiusM = L.getRadius()
    if (ll && typeof ll.lat === 'number' && typeof ll.lng === 'number' && typeof radiusM === 'number' && radiusM > 0) {
      const points = 32
      const coords: [number, number][] = []
      const R = 6371000 // earth radius in meters
      const latRad = (ll.lat * Math.PI) / 180
      for (let i = 0; i <= points; i++) {
        const angle = (2 * Math.PI * i) / points
        const lat = ll.lat + (radiusM / R) * (180 / Math.PI) * Math.cos(angle)
        const lng = ll.lng + (radiusM / R) * (180 / Math.PI) * Math.sin(angle) / Math.cos(latRad)
        coords.push([lng, lat])
      }
      return { type: 'Polygon', coordinates: [coords] }
    }
  }
  if (typeof L.toGeoJSON === 'function') {
    const feature = L.toGeoJSON()
    if (feature?.geometry) return feature.geometry
  }
  if (L.getLatLngs) {
    const latlngs = L.getLatLngs()
    if (Array.isArray(latlngs) && latlngs.length > 0) {
      const first = latlngs[0]
      if (typeof first?.lat === 'number' && typeof first?.lng === 'number') {
        return {
          type: 'LineString',
          coordinates: (latlngs as { lat: number; lng: number }[]).map((p) => [p.lng, p.lat]),
        }
      }
      const ring = latlngs[0] as { lat: number; lng: number }[]
      if (Array.isArray(ring) && ring.length > 0 && typeof ring[0]?.lat === 'number') {
        return {
          type: 'Polygon',
          coordinates: (latlngs as { lat: number; lng: number }[][]).map((r) =>
            (r as { lat: number; lng: number }[]).map((p) => [p.lng, p.lat])
          ),
        }
      }
    }
  }
  if (L.getLatLng) {
    const ll = L.getLatLng()
    if (ll && typeof ll.lat === 'number' && typeof ll.lng === 'number')
      return { type: 'Point', coordinates: [ll.lng, ll.lat] }
  }
  if (L.getBounds) {
    const b = L.getBounds()
    const sw = b.getSouthWest()
    const ne = b.getNorthEast()
    return {
      type: 'Polygon',
      coordinates: [
        [
          [sw.lng, sw.lat],
          [ne.lng, sw.lat],
          [ne.lng, ne.lat],
          [sw.lng, ne.lat],
          [sw.lng, sw.lat],
        ],
      ],
    }
  }
  return null
}

export const Route = createFileRoute('/_protected/dashboard/locations/map')({
  component: LocationsMapPage,
})

function LocationsMapPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', activeTenantId],
    queryFn: () => client.locations.list(),
    enabled: !!activeTenantId,
  })

  const { data: mapZones = [] } = useQuery({
    queryKey: ['mapZones', activeTenantId],
    queryFn: () => client.mapZones.list(),
    enabled: !!activeTenantId,
  })

  const drawGroupRef = React.useRef<{ getLayers(): unknown[] } | null>(null)
  const [saveZoneOpen, setSaveZoneOpen] = React.useState(false)
  const [saveZoneName, setSaveZoneName] = React.useState('')
  const [saveZoneGeometry, setSaveZoneGeometry] = React.useState<Record<string, unknown> | null>(null)

  const createZone = useMutation({
    mutationFn: (params: { name: string; geometry: Record<string, unknown> }) =>
      client.mapZones.create({
        tenantId: activeTenantId!,
        name: params.name,
        geometry: params.geometry,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapZones', activeTenantId] })
      setSaveZoneOpen(false)
      setSaveZoneName('')
      setSaveZoneGeometry(null)
      toast.success('Zone saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteZone = useMutation({
    mutationFn: (zoneId: string) =>
      client.mapZones.delete(activeTenantId!, zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapZones', activeTenantId] })
      toast.success('Zone removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const locationsWithCoords = React.useMemo(
    () =>
      locations.filter(
        (loc): loc is LocationRow & { latitude: number; longitude: number } =>
          loc != null &&
          typeof (loc as LocationRow).latitude === 'number' &&
          typeof (loc as LocationRow).longitude === 'number'
      ),
    [locations]
  )

  const [locationIdToSetPosition, setLocationIdToSetPosition] = React.useState<string | null>(null)
  const locationToSet = locationIdToSetPosition
    ? locations.find((l) => l?.id === locationIdToSetPosition)
    : null

  const updateLocation = useMutation({
    mutationFn: (params: {
      locationId: string
      latitude: number
      longitude: number
    }) =>
      client.locations.update({
        tenantId: activeTenantId!,
        locationId: params.locationId,
        latitude: params.latitude,
        longitude: params.longitude,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      setLocationIdToSetPosition(null)
      toast.success('Position updated')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const clearPosition = useMutation({
    mutationFn: (locationId: string) =>
      client.locations.update({
        tenantId: activeTenantId!,
        locationId,
        clearPosition: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      toast.success('Position removed')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const openEditModal = useLocationsPageStore((s) => s.openEditModal)

  const handleEditLocation = (id: string) => {
    openEditModal(id)
    navigate({ to: '/dashboard/locations/hierarchy' })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Map</h1>
        <p className="text-muted-foreground text-sm">
          View and configure locations on the map. Search for a place, pick a location to fly to, or
          set a location&apos;s position by clicking the map. Draw shapes with the toolbar.
        </p>
      </div>

      {/* Set-position banner */}
      {locationIdToSetPosition && locationToSet && (
        <div className="bg-muted flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span>
            Click the map to set position for <strong>{locationToSet.name}</strong>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLocationIdToSetPosition(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Toolbar: location search + set position */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={locationIdToSetPosition ?? '__none__'}
          onValueChange={(v) => setLocationIdToSetPosition(v === '__none__' ? null : v)}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Set position for…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— None —</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc!.id!} value={loc!.id!}>
                {loc!.name ?? loc!.id}
                {(loc as LocationRow).latitude != null ? ' (has position)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-[560px] w-full overflow-hidden rounded-lg border">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading…
          </div>
        ) : (
          <MapComponent center={DEFAULT_CENTER} zoom={10}>
            <MapTileLayer />
            <MapZoomControl />
            <MapFullscreenControl />
            <MapLocateControl />
            <MapSearchPanel locations={locations} />
            <FitBoundsToLocations locations={locationsWithCoords} />
            {locationsWithCoords.map((loc) => (
              <MapMarker
                key={loc.id!}
                position={[loc.latitude, loc.longitude]}
                eventHandlers={{
                  click: () => {},
                }}
              >
                <MapPopup>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="font-medium">{loc.name ?? '—'}</div>
                    {(loc as LocationRow).location_type && (
                      <div className="text-muted-foreground capitalize">
                        {(loc as LocationRow).location_type}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditLocation(loc.id!)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearPosition.mutate(loc.id!)}
                      >
                        Remove position
                      </Button>
                    </div>
                  </div>
                </MapPopup>
              </MapMarker>
            ))}
            <MapClickToSetPosition
              locationId={locationIdToSetPosition}
              onSet={(lat, lng) => {
                if (locationIdToSetPosition)
                  updateLocation.mutate({
                    locationId: locationIdToSetPosition,
                    latitude: lat,
                    longitude: lng,
                  })
              }}
              onCancel={() => setLocationIdToSetPosition(null)}
            />
            <SavedZonesLayer zones={mapZones} />
            <MapDrawControl
              onLayersChange={(fg) => {
                drawGroupRef.current = fg
              }}
            >
              <MapDrawMarker />
              <MapDrawPolyline />
              <MapDrawCircle />
              <MapDrawRectangle />
              <MapDrawPolygon />
              <MapDrawEdit />
              <MapDrawDelete />
              <MapDrawUndo />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                title="Save last drawn shape as zone"
                aria-label="Save zone"
                className="border"
                onClick={() => {
                  const fg = drawGroupRef.current
                  const layers = fg?.getLayers?.() ?? []
                  const last = layers[layers.length - 1]
                  if (!last) {
                    toast.error('Draw a shape first, then click Save zone')
                    return
                  }
                  const geom = layerToGeoJSONGeometry(last)
                  if (!geom) {
                    toast.error('Could not convert shape to save')
                    return
                  }
                  setSaveZoneGeometry(geom)
                  setSaveZoneName('')
                  setSaveZoneOpen(true)
                }}
              >
                <Save className="size-4" />
              </Button>
            </MapDrawControl>
          </MapComponent>
        )}
      </div>

      {/* Save zone dialog */}
      <ResponsiveDialog open={saveZoneOpen} onOpenChange={setSaveZoneOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Save zone</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={saveZoneName}
              onChange={(e) => setSaveZoneName(e.target.value)}
              placeholder="e.g. Delivery area"
            />
          </Field>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              disabled={!saveZoneName.trim() || createZone.isPending}
              onClick={() => {
                if (saveZoneName.trim() && saveZoneGeometry)
                  createZone.mutate({ name: saveZoneName.trim(), geometry: saveZoneGeometry })
              }}
            >
              Save
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Saved zones list */}
      {mapZones.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-muted-foreground mb-2 text-sm font-medium">Saved zones</div>
          <ul className="flex flex-wrap gap-2">
            {mapZones.map((zone) => (
              <li
                key={zone.id!}
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <span>{zone.name ?? 'Unnamed'}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete zone"
                  onClick={() => deleteZone.mutate(zone.id!)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Renders saved map zones as GeoJSON layers on the map. */
function SavedZonesLayer({ zones }: { zones: MapZoneRow[] }) {
  const map = useMap()
  const { L } = useLeaflet()

  React.useEffect(() => {
    if (!L || !map) return
    const lg = L.layerGroup()
    const style = () => ({ color: 'var(--color-primary)', weight: 2, fillOpacity: 0.15 })
    zones.forEach((zone) => {
      if (!zone.geometry || typeof zone.geometry !== 'object') return
      try {
        const geom = zone.geometry as { type?: string; coordinates?: number[] }
        const feature = { type: 'Feature' as const, geometry: zone.geometry, properties: {} }
        /* Point = old saved circle (or marker): draw as circle so we don't get a blue marker icon */
        const pathStyle = { color: 'var(--color-primary)', weight: 2, fillColor: 'var(--color-primary)', fillOpacity: 0.15 }
        const options =
          geom.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2
            ? {
                style: style,
                pointToLayer: (_feature: unknown, latlng: { lat: number; lng: number }) =>
                  L.circle(latlng, { radius: 80, ...pathStyle }),
              }
            : { style: style }
        const geoJsonLayer = L.geoJSON(feature, options)
        geoJsonLayer.eachLayer((layer) => lg.addLayer(layer))
      } catch {
        // ignore invalid geometry
      }
    })
    lg.addTo(map)
    return () => {
      lg.remove()
    }
  }, [L, map, zones])

  return null
}

/** Single search card: place (address) search + location search in one panel. */
function MapSearchPanel({ locations }: { locations: LocationRow[] }) {
  const map = useMap()
  const [locationQuery, setLocationQuery] = React.useState('')

  const handlePlaceSelect = React.useCallback(
    (feature: { geometry?: { coordinates?: number[] } }) => {
      if (map && feature?.geometry?.coordinates?.length >= 2) {
        const [lng, lat] = feature.geometry.coordinates
        map.flyTo([lat, lng], 16)
      }
    },
    [map]
  )

  const filteredLocations = React.useMemo(() => {
    if (!locationQuery.trim()) return locations.slice(0, 15)
    const q = locationQuery.toLowerCase()
    return locations
      .filter(
        (l) =>
          l?.name?.toLowerCase().includes(q) ||
          (l as LocationRow).code?.toLowerCase().includes(q)
      )
      .slice(0, 15)
  }, [locations, locationQuery])

  return (
    <MapControlContainer className="top-1 left-1 z-[1001] w-72">
      <div className="flex flex-col gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur-sm">
        <div className="grid gap-1.5">
          <label className="text-muted-foreground text-xs font-medium">Place</label>
          <PlaceAutocomplete
            placeholder="Address or place…"
            onPlaceSelect={handlePlaceSelect}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-muted-foreground text-xs font-medium">Your locations</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Find location…"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="border-input bg-background placeholder:text-muted-foreground h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {locationQuery.length > 0 && (
              <ul className="border-input bg-popover absolute top-full left-0 right-0 z-10 mt-0.5 max-h-44 overflow-auto rounded-md border py-1 shadow-md">
                {filteredLocations.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No locations match
                  </li>
                )}
                {filteredLocations.map((loc) => {
                  const hasPos =
                    typeof (loc as LocationRow & { latitude?: number }).latitude === 'number'
                  return (
                    <li key={loc!.id!}>
                      <button
                        type="button"
                        className="hover:bg-muted w-full px-3 py-2 text-left text-sm"
                        onClick={() => {
                          setLocationQuery('')
                          if (hasPos && map) {
                            const lat = (loc as LocationRow & { latitude: number }).latitude
                            const lng = (loc as LocationRow & { longitude: number }).longitude
                            map.flyTo([lat, lng], 16)
                          }
                        }}
                      >
                        {loc!.name ?? loc!.id}
                        {hasPos ? '' : ' · no position'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </MapControlContainer>
  )
}

/** When locations with coords load, fly to their bounding center so they're visible. */
function FitBoundsToLocations({
  locations,
}: {
  locations: Array<LocationRow & { latitude: number; longitude: number }>
}) {
  const map = useMap()
  const fitted = React.useRef(false)

  React.useEffect(() => {
    if (!map || locations.length === 0 || fitted.current) return
    fitted.current = true
    const lats = locations.map((l) => l.latitude)
    const lngs = locations.map((l) => l.longitude)
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    const span = Math.max(
      Math.max(...lats) - Math.min(...lats),
      Math.max(...lngs) - Math.min(...lngs)
    )
    const zoom = span > 1 ? 8 : span > 0.5 ? 9 : span > 0.1 ? 11 : 14
    map.flyTo([centerLat, centerLng], zoom)
  }, [map, locations])

  return null
}

/** When locationId is set, map clicks set that location's position and call onSet. */
function MapClickToSetPosition({
  locationId,
  onSet,
  onCancel,
}: {
  locationId: string | null
  onSet: (lat: number, lng: number) => void
  onCancel: () => void
}) {
  useMapEvents({
    click: (e) => {
      if (!locationId) return
      onSet(e.latlng.lat, e.latlng.lng)
      onCancel()
    },
  })
  return null
}
