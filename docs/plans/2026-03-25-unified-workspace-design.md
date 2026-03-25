# BuildConnect v2 — Unified Workspace Design

**Date:** 2026-03-25
**Status:** Approved

## Overview

Rebuild BuildConnect from a 4-tab layout (Map, Building, Floor Plan, 3D View) into a unified MapLibre-centric workspace. All editing — indoor floors, outdoor cable routes, 3D visualization — happens on a single map canvas with context-sensitive side panels.

## Data Model

### Project

```
Project
├── id: string
├── name: string
├── customer: string
├── status: ProjectStatus ('draft' | 'survey' | 'design' | 'review' | 'complete')
├── createdAt: number
├── updatedAt: number
├── center: GeoPoint | null          // derived from first building, persisted for quick map load
├── contacts: Contact[]
├── buildings: Building[]
└── outdoorPlan: OutdoorPlan
```

- `Project.address` removed — physical addresses live on buildings.
- `Project.building` (singular) becomes `Project.buildings[]` (array).
- `Project.center` is derived from the first building's location.

### Contact

```
Contact {
  id: string
  name: string
  phone: string
  email: string
  role: string                       // free text: "Building Manager", "Tenant", etc.
}
```

### Building

```
Building {
  id: string
  name: string
  address: string
  footprint: GeoPolygon | null
  footprintLocal: Point2D[]
  groundFloorLevel: number           // default 0, configurable per locale
  defaultFloorHeight: number
  floors: Floor[]
  sectionCuts: SectionCut[]
}
```

- `groundFloorLevel` determines which floors are above/below ground.
- `sectionCuts` store cut lines for the 2D vertical cross-section view.

### Floor

```
Floor {
  id: string
  level: number                      // integer for ordering
  label: string                      // editable, e.g., "Lobby", "Mezzanine", "Floor 4"
  shortLabel: string                 // editable, e.g., "L", "M", "4", "-1"
  height: number                     // floor-to-floor height in meters
  walls: Wall[]
  doors: Door[]
  windows: Window[]
  equipment: Equipment[]
  cableRoutes: CableRoute[]
  annotations: Annotation[]
  photos: PhotoAnnotation[]
}
```

- `shortLabel` added for compact floor navigation.
- `isAboveGround` derived: `floor.level >= building.groundFloorLevel`.
- Floor ordering uses physical stacking: higher levels appear higher on screen.

### SectionCut

```
SectionCut {
  id: string
  label: string                      // e.g., "Section A"
  start: GeoPoint
  end: GeoPoint
}
```

### OutdoorPlan (project-level)

```
OutdoorPlan {
  fiberSourceLocation: GeoPoint | null
  cableRoutes: CableRoute[]         // geo-positioned, not local coords
  equipment: Equipment[]             // geo-positioned
  annotations: Annotation[]          // geo-positioned
}
```

One shared outdoor plan at the project level covering the entire site.

### Unchanged Types

Wall, Door, Window, Equipment, CableRoute, Annotation, PhotoAnnotation, Point2D, Point3D, GeoPoint, GeoLineString, GeoPolygon, EquipmentType, CableType — all unchanged from current model.

## Unified Map Workspace

### Layout

```
Desktop (>1024px):
┌─────────────────────────────────────────────────────────┐
│  ← Home    Project Name                  [map controls] │
├────┬──────────────────────────────────┬─────────────────┤
│ F4 │                                  │                 │
│ F3 │                                  │   Properties    │
│ F2 │        MapLibre Canvas           │   Side Panel    │
│ F1 │       (main workspace)           │   (~320px)      │
│----│                                  │                 │
│ L1 │                                  │                 │
│ L2 │                                  │                 │
├────┴──────────────────────────────────┴─────────────────┤
│  [select] [wall] [door] [window] [equip] [cable] [note] │
└─────────────────────────────────────────────────────────┘

Mobile (<768px):
┌───────────────────────────┐
│ ← Home   Project Name  ⚙ │
├───┬───────────────────────┤
│ 4 │                       │
│ 3 │   MapLibre Canvas     │
│ 2 │                       │
│ 1 │                       │
│---│                       │
│-1 │                  [+]  │  ← FAB expands to tool sheet
│-2 │                       │
├───┴───────────────────────┤
│ ▬ Properties bottom sheet │
│   (swipe up to expand)    │
└───────────────────────────┘
```

### Floor selector (left side)

- Compact vertical strip showing floor short labels.
- Physical stacking order with subtle "Above" / "Below" section dividers.
- Tap a floor to enter floor editing mode.
- Active floor highlighted.
- Visible only when a building is focused.

### Properties side panel (right side)

- Desktop: non-modal, pushes content, ~320px wide, collapsible.
- Tablet (768-1024px): non-modal bottom sheet, ~1/3 screen height, expandable to full, draggable.
- Mobile (<768px): modal bottom sheet, ~1/3 screen, expandable to full, swipe down to dismiss.

### View modes

Fluid transitions based on selection and zoom:

1. **Site overview** (zoomed out): All building footprints + 3D. Outdoor cable routes visible. Side panel shows project info and contacts.
2. **Building focus** (tap a building): Map flies to building. Side panel shows building details and floor list. 3D model prominent.
3. **Floor editing** (tap a floor in selector): Street tiles fade to ~10% opacity. Floor plan renders as MapLibre GeoJSON layers. Drawing tools activate. Side panel shows floor properties.
4. **Element editing** (tap any element): Element selected and highlighted. Side panel shows editable properties.

### Map tile opacity

- Site overview / outdoor work: 100%.
- Indoor floor editing: ~10%, just enough for orientation.
- User can adjust with a small opacity slider.

### 3D building on the map

- Only renders floors where `floor.level >= building.groundFloorLevel`.
- Visible in site overview and building focus modes.
- Hidden during floor editing mode (would obscure 2D floor plan).

### MapLibre controls

- Zoom, compass, geolocate buttons moved to top-right corner above the properties panel.
- Drawing tools in bottom toolbar (desktop) or "+" FAB (mobile).

## Touch vs Mouse Interaction

### Input detection

Detect from `PointerEvent.pointerType` — `'touch'` vs `'mouse'`. Switch seamlessly mid-session.

### Mouse mode (direct placement)

- Click to place elements at cursor position.
- Click-click for walls/cables (click start, click end, continues from last point).
- Hover shows preview and snap indicators.
- Right-click for context menu (delete, properties).
- Scroll wheel to zoom, middle-click-drag to pan.

### Touch mode (crosshair reticle)

- Reticle (~48px circle) fixed at screen center.
- Single-finger drag pans the map (positions reticle over target).
- Tap the reticle to place the selected element.
- Tap outside the reticle to select/interact with existing elements.
- Pinch to zoom, two-finger rotate/tilt.

**Wall/cable drawing in touch mode:**
1. Select Wall tool → hint: "Pan to start point, tap ⊕ to begin"
2. Tap reticle → first point placed, rubber-band line follows reticle.
3. Pan to next point → tap reticle → segment added, continues.
4. Tap "Done" in toolbar to finish.

**Contextual hints:**
- Short text near reticle: "Tap ⊕ to place wall start"
- Fades after ~3 uses per tool (count stored in localStorage).

### After placement (both modes)

- Newly placed element auto-selected and in edit mode.
- Properties panel slides up (mobile) or populates (desktop).
- User can edit or ignore and continue working.
- Tapping elsewhere deselects and returns panel to context default.

### Snapping (both modes)

- Snap to existing wall endpoints (within 0.3m).
- Snap to wall midpoints.
- Snap to perpendicular/parallel alignment with nearby walls.
- Snap to grid (configurable, default 0.15m) as fallback.
- Visual indicators: small circles at snap points, dashed guide lines.
- Snapping togglable.

## View → Edit Pattern

Global UI pattern: all data displayed in view mode by default. Selecting data or tapping an edit button enters edit mode. Delete lives in edit mode only (unless explicitly added to view mode).

### Project info panel (site overview)

- **View mode**: Name, customer, status badge. Contact list (name + role). Building list (name + address).
- **Contact view actions**: Tap phone → `tel:` dial. Tap email → `mailto:` compose. Tap SMS → `sms:` text.
- **Edit mode** (pencil icon): All fields editable. Add/remove contacts. Change status. Delete project at bottom with confirmation.

### Building panel (building focus)

- **View mode**: Name, address, floor list with labels and short labels in physical stacking order.
- **Edit mode**: Edit name, address. Add/remove/reorder floors. Edit floor labels and short labels. Set ground floor level. Delete building with confirmation.

### Element properties panel (element selected)

- **View mode**: Element type, key properties.
- **Edit mode** (auto-entered on new placement, or tap to edit existing): All properties editable. Delete at bottom.
- Fields by element type:
  - **Wall**: thickness, interior/exterior toggle.
  - **Door**: width, type (free text).
  - **Window**: width, height, sill height.
  - **Equipment**: type (dropdown), label, custom key-value properties.
  - **Cable route**: cable type (dropdown), label.
  - **Annotation**: full text editor, auto-timestamp.

### Panel transitions

- Selecting a different object type transitions the panel content.
- Dismissed/collapsed panel reopens on element selection.
- Escape or tapping map background deselects and returns panel to contextual default.

## Door & Window Rendering

### Doors (2D floor plan)

- Standard architectural symbol: line for door width + 90° arc showing swing direction.
- Color: amber/orange, distinct from walls.
- Selected: handles to adjust position along wall and swing direction.

### Windows (2D floor plan)

- Standard architectural symbol: thin double-line break in wall with three parallel lines.
- Color: light blue to suggest glass.
- Selected: handles to adjust position along wall and width.

### Element selection and modification

- **Mouse**: Click to select. Drag handles to resize/reposition. Properties panel for editable fields.
- **Touch**: Tap to select. Properties panel for value changes. "Move" action re-enters placement mode with crosshair.
- **Walls**: Handles at endpoints. Drag to adjust length/angle.
- **Doors/Windows**: Handle slides along parent wall.
- **Delete**: Select → view mode → tap edit → delete button with confirmation.

## Annotation editing

- On placement: auto-enters edit mode, text cursor active for immediate typing.
- On tap (view mode): shows note text + timestamp.
- On edit: text becomes editable, supports multi-line, can reposition by dragging.

## 2D Vertical Cross-Section View

### Cut line creation

- "Section Cut" tool in toolbar (scissors/blade icon).
- User places two points defining the cut line (same interaction as wall drawing).
- Cut line shown on floor plan: dashed line with direction arrows and label (e.g., "Section A").
- Multiple cut lines per building, stored in `Building.sectionCuts[]`.

### Cross-section display

- Opens in the right-side properties panel (desktop) or expands to full screen (mobile).
- Not a separate route — lives within the map workspace.
- Shows all floors stacked vertically with correct heights.
- For each floor: renders walls, doors, windows that the cut line intersects.
- Floor slabs as horizontal lines with floor labels on the left.
- Above/below ground headers match floor navigation.

### What's visible

- Wall thickness at cut (filled rectangles).
- Door openings (gaps with threshold line).
- Window openings (gaps with sill and header lines).
- Vertical risers/conduits near cut plane (within configurable proximity, default 1m).
- Equipment near cut plane projected onto view.
- Floor-to-floor height dimension annotations on the side.

### Interaction

- View-only initially — visualization of existing data.
- Tap a floor in cross-section to navigate main map to that floor.
- Future enhancement: place vertical cable routes directly in this view.

### Rendering

- Dedicated Canvas2D renderer (not MapLibre — schematic view, no geo-coordinates).
- Calculates wall intersections with cut line via line-segment math.
- Stacks floors at correct heights with configurable pixels-per-meter scale.
- Independent zoom/pan from main map.

## Project Dashboard

### Search

- Search bar at top of dashboard.
- Client-side instant filtering (all data in IndexedDB).
- Searches: project name, customer name, building addresses, contact names.

### Project cards

- Show: project name, customer, status badge, building count, last modified date.
- No delete button on cards (delete lives in project edit panel).
- Sorted by last modified (most recent first).
- Tap to open project in map workspace.

### New project creation

- Simplified: project name + customer only (no address).
- After creation, opens map workspace where user adds first building.

## Building Management on the Map

### Adding a new building

- "Add Building" button in side panel (or "+" FAB on mobile).
- Side panel shows form: building name, address.
- Two ways to set footprint:
  - **Type address**: Geocodes → map flies to location → OSM buildings load → user taps one.
  - **Tap building on map**: Footprint captured, address reverse-geocoded and pre-filled.
- Footprint selection on map only active during "Add Building" or "Edit Building Address" flows.
- After footprint selected: floor configuration shown inline (count, height, ground floor).
- Tap "Save" to confirm.

### Floor management

- Shown in side panel when building focused.
- Physical stacking with above/below ground headers.
- "Add Floor" inserts a floor — user picks position in the stack.
- Each floor row: label, short label.
- Tap floor → enter floor editing mode on map.
- Edit mode: edit label, short label, height. Delete with confirmation.
- Drag handle to reorder (level numbers recalculate automatically).

### Ground floor designation

- Dropdown on building edit panel: "Ground floor is: [Floor 1 ▼]".
- Changing recalculates above/below ground classification.
- Affects 3D rendering and floor list headers.

## Global UI Patterns

### Material Design conventions

- Side panels: non-modal on desktop, modal bottom sheets on mobile.
- FAB for primary actions on small screens.
- Progressive disclosure (hints, expandable panels).

### Responsive breakpoints

- Desktop: >1024px — side panel pushes content.
- Tablet: 768-1024px — non-modal bottom sheet.
- Mobile: <768px — modal bottom sheet, "+" FAB replaces toolbar.

### Touch gestures

- Single-finger drag: pan.
- Pinch: zoom.
- Two-finger rotate: tilt/rotate map.
- Tap: select or place (depending on mode).
- Long-press: context menu (future enhancement).
- Swipe down: dismiss bottom sheet.
