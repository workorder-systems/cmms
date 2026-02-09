import type { Meta, StoryObj } from '@storybook/react';
import {
  Map,
  MapTileLayer,
  MapMarker,
  MapPopup,
  MapTooltip,
  MapZoomControl,
  MapFullscreenControl,
  MapLocateControl,
  MapSearchControl,
  MapLayers,
  MapLayersControl,
  MapLayerGroup,
  MapCircle,
  MapPolygon,
  MapPolyline,
  MapRectangle,
  MapDrawControl,
  MapDrawMarker,
  MapDrawPolyline,
  MapDrawCircle,
  MapDrawRectangle,
  MapDrawPolygon,
  MapDrawEdit,
  MapDrawDelete,
  MapDrawUndo,
  MapMarkerClusterGroup,
} from './map';

const meta = {
  title: 'Data/Map',
  component: Map,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A map component built for shadcn/ui, following the same design patterns and styles. Uses Leaflet with React Leaflet to provide interactive mapping capabilities.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    center: {
      control: 'object',
      description: 'Initial center coordinates [latitude, longitude]',
    },
    zoom: {
      control: { type: 'number', min: 1, max: 18, step: 1 },
      description: 'Initial zoom level (1-18)',
      defaultValue: 15,
    },
    maxZoom: {
      control: { type: 'number', min: 1, max: 18, step: 1 },
      description: 'Maximum zoom level',
      defaultValue: 18,
    },
  },
} satisfies Meta<typeof Map>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default center coordinates (Toronto, Canada)
const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];

// Common locations for examples
const LOCATIONS = {
  toronto: [43.6532, -79.3832] as [number, number],
  downtown: [43.651, -79.347] as [number, number],
  westEnd: [43.662, -79.395] as [number, number],
  eastEnd: [43.645, -79.365] as [number, number],
  northYork: [43.7615, -79.4111] as [number, number],
};

// ============================================================================
// Basic Examples
// ============================================================================

/**
 * The simplest map configuration with just a tile layer. This is the foundation
 * for all other map examples. The map automatically adapts to light and dark themes.
 */
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A minimal map setup with default tile layer. The tile layer automatically switches between light and dark themes based on your system preferences.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
      </Map>
    </div>
  ),
};

/**
 * Add markers to highlight specific locations on the map. Click a marker to see
 * its popup with additional information.
 */
export const WithMarker: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Markers are used to indicate points of interest. They support custom icons and can display popups or tooltips when clicked or hovered.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
        <MapMarker position={LOCATIONS.toronto}>
          <MapPopup>
            <div className="space-y-1">
              <h3 className="font-semibold">Toronto City Hall</h3>
              <p className="text-sm text-muted-foreground">
                100 Queen St W, Toronto, ON
              </p>
            </div>
          </MapPopup>
        </MapMarker>
      </Map>
    </div>
  ),
};

/**
 * Display multiple markers across different locations. Each marker can have
 * its own popup with unique content.
 */
export const MultipleMarkers: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'You can add as many markers as needed. Each marker is independent and can have its own popup content, tooltip, or custom icon.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={LOCATIONS.toronto} zoom={12}>
        <MapTileLayer />
        <MapMarker position={LOCATIONS.toronto}>
          <MapPopup>
            <div>
              <h3 className="font-semibold">Downtown Core</h3>
              <p className="text-sm text-muted-foreground">Financial District</p>
            </div>
          </MapPopup>
        </MapMarker>
        <MapMarker position={LOCATIONS.downtown}>
          <MapPopup>
            <div>
              <h3 className="font-semibold">Entertainment District</h3>
              <p className="text-sm text-muted-foreground">Theatres & Restaurants</p>
            </div>
          </MapPopup>
        </MapMarker>
        <MapMarker position={LOCATIONS.westEnd}>
          <MapPopup>
            <div>
              <h3 className="font-semibold">West End</h3>
              <p className="text-sm text-muted-foreground">Residential Area</p>
            </div>
          </MapPopup>
        </MapMarker>
        <MapMarker position={LOCATIONS.eastEnd}>
          <MapPopup>
            <div>
              <h3 className="font-semibold">East End</h3>
              <p className="text-sm text-muted-foreground">Historic Neighborhood</p>
            </div>
          </MapPopup>
        </MapMarker>
      </Map>
    </div>
  ),
};

/**
 * Use tooltips for lightweight information that appears on hover. Tooltips are
 * less intrusive than popups and work well for simple labels.
 */
export const WithTooltip: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Tooltips provide a lightweight way to show information on hover. They are positioned automatically and work well for simple labels or quick information.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
        <MapMarker position={LOCATIONS.toronto}>
          <MapTooltip>Hover to see tooltip</MapTooltip>
        </MapMarker>
        <MapMarker position={LOCATIONS.downtown}>
          <MapTooltip side="right">Tooltip on the right</MapTooltip>
        </MapMarker>
        <MapMarker position={LOCATIONS.westEnd}>
          <MapTooltip side="bottom">Tooltip below</MapTooltip>
        </MapMarker>
      </Map>
    </div>
  ),
};

/**
 * When you have many markers in close proximity, use marker clustering to
 * group them together. Clusters automatically expand when zooming in.
 */
export const MarkerClustering: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Marker clustering groups nearby markers together to improve performance and readability. As you zoom in, clusters automatically split into individual markers.',
      },
    },
  },
  render: () => {
    // Generate multiple markers around Toronto
    const markers = Array.from({ length: 20 }, (_, i) => ({
      lat: LOCATIONS.toronto[0] + (Math.random() - 0.5) * 0.1,
      lng: LOCATIONS.toronto[1] + (Math.random() - 0.5) * 0.1,
      id: i + 1,
    }));

    return (
      <div className="h-[500px] w-full rounded-lg border">
        <Map center={LOCATIONS.toronto} zoom={12}>
          <MapTileLayer />
          <MapMarkerClusterGroup>
            {markers.map((marker) => (
              <MapMarker key={marker.id} position={[marker.lat, marker.lng]}>
                <MapPopup>Marker {marker.id}</MapPopup>
              </MapMarker>
            ))}
          </MapMarkerClusterGroup>
        </Map>
      </div>
    );
  },
};

// ============================================================================
// Controls
// ============================================================================

/**
 * Zoom controls allow users to zoom in and out of the map. The buttons are
 * automatically disabled when reaching min/max zoom levels.
 */
export const WithZoomControl: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Zoom controls provide buttons to zoom in and out. They are positioned in the top-left corner by default and automatically disable at zoom limits.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
        <MapZoomControl />
      </Map>
    </div>
  ),
};

/**
 * Fullscreen control allows users to view the map in fullscreen mode. Click
 * the button to toggle fullscreen on and off.
 */
export const WithFullscreenControl: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Fullscreen control provides a button to enter and exit fullscreen mode. The button icon changes based on the current fullscreen state.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
        <MapFullscreenControl />
      </Map>
    </div>
  ),
};

/**
 * Locate control uses the browser's geolocation API to find and track the
 * user's current location. Click to start tracking, click again to stop.
 */
export const WithLocateControl: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The locate control requests the user\'s location and centers the map on it. When active, it shows a pulsing marker at the current location. Requires user permission for geolocation.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
        <MapLocateControl />
      </Map>
    </div>
  ),
};

/**
 * Search control provides a place autocomplete input to search for locations
 * and automatically center the map on the selected result.
 */
export const WithSearchControl: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Search control integrates with place autocomplete to allow users to search for locations. When a place is selected, the map automatically centers on that location.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
        <MapSearchControl placeholder="Search for a place..." />
      </Map>
    </div>
  ),
};

/**
 * Combine multiple controls for a complete map experience. Controls are
 * positioned to avoid overlap and provide easy access to all features.
 */
export const AllControls: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'You can combine multiple controls on the same map. They are positioned to avoid overlap: zoom (top-left), fullscreen (top-right), locate (bottom-right), and search (top-left below zoom).',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={DEFAULT_CENTER} zoom={13}>
        <MapTileLayer />
        <MapZoomControl />
        <MapFullscreenControl />
        <MapLocateControl />
        <MapSearchControl placeholder="Search for a place..." />
      </Map>
    </div>
  ),
};

// ============================================================================
// Shapes & Overlays
// ============================================================================

/**
 * Draw various shapes on the map: circles, polygons, polylines, and rectangles.
 * Shapes automatically adapt to the current theme colors.
 */
export const WithShapes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The map supports various geometric shapes: circles (radius-based), polygons (multi-point areas), polylines (connected lines), and rectangles (bounding boxes). All shapes respect theme colors.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={LOCATIONS.toronto} zoom={13}>
        <MapTileLayer />
        <MapCircle center={LOCATIONS.toronto} radius={800} />
        <MapPolygon
          positions={[
            [43.66, -79.38],
            [43.65, -79.37],
            [43.64, -79.39],
            [43.645, -79.385],
          ]}
        />
        <MapPolyline
          positions={[
            LOCATIONS.toronto,
            LOCATIONS.downtown,
            LOCATIONS.westEnd,
          ]}
        />
        <MapRectangle
          bounds={[
            [43.66, -79.39],
            [43.64, -79.37],
          ]}
        />
        <MapMarker position={LOCATIONS.toronto}>
          <MapPopup>
            <div>
              <h3 className="font-semibold">Shape Examples</h3>
              <p className="text-sm text-muted-foreground">
                Circle, Polygon, Polyline, and Rectangle
              </p>
            </div>
          </MapPopup>
        </MapMarker>
      </Map>
    </div>
  ),
};

// ============================================================================
// Layers & Groups
// ============================================================================

/**
 * Switch between different tile layers (map styles) using the layers control.
 * This is useful for providing satellite imagery, terrain maps, or custom tile sources.
 */
export const WithLayersControl: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The layers control allows users to switch between different tile layers. Wrap your map in MapLayers and add multiple MapTileLayer components with unique names. The control appears as a dropdown in the top-right corner.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <MapLayers>
        <Map center={LOCATIONS.toronto} zoom={13}>
          <MapTileLayer name="Default" />
          <MapTileLayer
            name="Satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />
          <MapLayersControl />
        </Map>
      </MapLayers>
    </div>
  ),
};

/**
 * Organize map content into layer groups that can be toggled on and off.
 * Useful for showing/hiding categories of markers, shapes, or other overlays.
 */
export const WithLayerGroups: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Layer groups allow you to organize map content into toggleable categories. Users can show or hide entire groups of markers, shapes, or other overlays using checkboxes in the layers control.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <MapLayers defaultLayerGroups={['Restaurants']}>
        <Map center={LOCATIONS.toronto} zoom={13}>
          <MapTileLayer />
          <MapLayerGroup name="Restaurants">
            <MapMarker position={LOCATIONS.toronto}>
              <MapPopup>
                <div>
                  <h3 className="font-semibold">Restaurant A</h3>
                  <p className="text-sm text-muted-foreground">Italian Cuisine</p>
                </div>
              </MapPopup>
            </MapMarker>
            <MapMarker position={LOCATIONS.downtown}>
              <MapPopup>
                <div>
                  <h3 className="font-semibold">Restaurant B</h3>
                  <p className="text-sm text-muted-foreground">French Bistro</p>
                </div>
              </MapPopup>
            </MapMarker>
          </MapLayerGroup>
          <MapLayerGroup name="Parks">
            <MapCircle center={LOCATIONS.westEnd} radius={300} />
            <MapRectangle
              bounds={[
                [43.66, -79.39],
                [43.64, -79.37],
              ]}
            />
          </MapLayerGroup>
          <MapLayersControl />
        </Map>
      </MapLayers>
    </div>
  ),
};

// ============================================================================
// Drawing Tools
// ============================================================================

/**
 * Enable users to draw shapes and markers directly on the map. Includes tools
 * for creating markers, lines, circles, rectangles, polygons, and editing/deleting them.
 */
export const WithDrawControl: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The draw control provides a complete set of drawing tools. Users can create markers, polylines, circles, rectangles, and polygons. Once created, shapes can be edited or deleted. The undo button reverts changes during edit/delete operations.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={LOCATIONS.toronto} zoom={13}>
        <MapTileLayer />
        <MapDrawControl>
          <MapDrawMarker />
          <MapDrawPolyline />
          <MapDrawCircle />
          <MapDrawRectangle />
          <MapDrawPolygon />
          <MapDrawEdit />
          <MapDrawDelete />
          <MapDrawUndo />
        </MapDrawControl>
      </Map>
    </div>
  ),
};

// ============================================================================
// Complete Examples
// ============================================================================

/**
 * A comprehensive example showcasing all map features working together:
 * multiple tile layers, all controls, markers with popups, and layer groups.
 * This demonstrates a production-ready map implementation.
 */
export const Complete: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'This example combines all map features: multiple tile layers, zoom controls, fullscreen, locate, search, layer groups, and markers. It demonstrates how to build a fully-featured interactive map.',
      },
    },
  },
  render: () => (
    <div className="h-[600px] w-full rounded-lg border">
      <MapLayers>
        <Map center={LOCATIONS.toronto} zoom={13}>
          <MapTileLayer name="Default" />
          <MapTileLayer
            name="Satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />
          <MapZoomControl />
          <MapFullscreenControl />
          <MapLocateControl />
          <MapSearchControl placeholder="Search for a place..." />
          <MapLayersControl />
          <MapMarker position={LOCATIONS.toronto}>
            <MapPopup>
              <div className="space-y-2">
                <h3 className="font-semibold">Toronto City Hall</h3>
                <p className="text-sm text-muted-foreground">
                  100 Queen St W, Toronto, ON M5H 2N2
                </p>
                <p className="text-sm">
                  A complete map example with all features enabled.
                </p>
              </div>
            </MapPopup>
          </MapMarker>
          <MapMarker position={LOCATIONS.downtown}>
            <MapPopup>
              <div className="space-y-2">
                <h3 className="font-semibold">Entertainment District</h3>
                <p className="text-sm text-muted-foreground">
                  King St W, Toronto, ON
                </p>
              </div>
            </MapPopup>
          </MapMarker>
        </Map>
      </MapLayers>
    </div>
  ),
};

/**
 * Interactive example demonstrating custom marker icons and styled popups.
 * Shows how to create a more branded or customized map experience.
 */
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'This example shows how to customize markers and popups. You can use custom React components as marker icons and style popups with your own content and styling.',
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-full rounded-lg border">
      <Map center={LOCATIONS.toronto} zoom={13}>
        <MapTileLayer />
        <MapZoomControl />
        <MapMarker
          position={LOCATIONS.toronto}
          icon={
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              📍
            </div>
          }>
          <MapPopup>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Custom Marker</h3>
              <p className="text-sm text-muted-foreground">
                This marker uses a custom icon component
              </p>
              <div className="flex gap-2">
                <button className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                  Action
                </button>
              </div>
            </div>
          </MapPopup>
        </MapMarker>
      </Map>
    </div>
  ),
};
