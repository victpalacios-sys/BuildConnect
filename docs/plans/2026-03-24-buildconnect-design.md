# BuildConnect Design Document

**Date:** 2026-03-24
**Status:** Approved

## Problem Statement

Telecom engineers and surveyors who install fiber/wireless networks in office and apartment buildings need a tool for:
- Field surveys with extremely fast data capture (seconds-long interaction bursts)
- Building modeling (exterior from OSM, interior walls sketched on-site)
- Network design (cable routes, equipment placement)
- Offline operation (no internet on-site)

Currently this workflow involves paper sketches, photos, and manual CAD work back in the office. BuildConnect digitizes the entire process.

## Architecture

PWA built with React 18 + TypeScript + Vite, using That Open Company's open-source BIM libraries for 3D modeling.

```
+---------------------------------------------------+
|                  BuildConnect PWA                  |
+----------+----------+----------+------------------+
| Map View | 2D Floor | 3D BIM   | Project          |
| (MapLibre|  Plan    |  Viewer  | Manager          |
|  + OSM)  | (Canvas) |(ThatOpen)|                  |
+----------+----------+----------+------------------+
|              State Management (Zustand)            |
+---------------------------------------------------+
|         Offline Storage Layer                      |
|  IndexedDB (projects, annotations, metadata)       |
|  OPFS (3D models, photos, cached map tiles)        |
+---------------------------------------------------+
|         Service Worker (offline + caching)          |
+---------------------------------------------------+
```

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18 + TypeScript | Largest ecosystem, most Three.js/BIM examples |
| Build | Vite + vite-plugin-pwa | Fast dev, excellent PWA support with Workbox |
| 3D Engine | @thatopen/components + @thatopen/fragments + Three.js | Open-source BIM, IFC support, high performance |
| 2D Canvas | HTML Canvas API (custom) | Lightweight, full control for snap grid and touch |
| Maps | MapLibre GL JS + OpenStreetMap | Free, open-source, offline tile caching |
| State | Zustand | Simple, performant, no boilerplate |
| Storage | IndexedDB (via idb) + OPFS | Browser-native, handles structured data + large files |
| Styling | Tailwind CSS | Utility-first, fast to build responsive UIs |
| Icons | Lucide React | Clean, consistent icon set |

## MVP Scope: Survey + Building Model

### Core Views

1. **Project Dashboard** - List/create projects, offline indicator, sync status
2. **Map View** - Locate building, view OSM footprint, mark fiber source, annotate outdoor cable route
3. **Building Setup** - Configure floors (from OSM or manual), floor heights, copy exterior walls
4. **2D Floor Plan Editor** - Main survey tool: walls, doors, windows, annotations, photos, cable routes
5. **3D BIM Viewer** - Auto-generated from 2D plans, uses That Open libraries, IFC export

### Data Model

```
Project
  name, address, customer, status, created/modified dates
  OutdoorPlan
    fiberSourceLocation (lat/lng)
    cableRoute (GeoJSON LineString)
    civilWorkAnnotations[]
  Building
    footprint (polygon from OSM or manual sketch)
    floorCount, floorHeight
    Floor[]
      level (number)
      exteriorWalls (auto-generated from footprint)
      interiorWalls[] { start, end, thickness }
      doors[] { wallId, position, width }
      windows[] { wallId, position, width, height }
      equipment[] { type, position, properties }
      cableRoutes[] { points[], cableType }
      annotations[] { text, position }
      photos[] { blobRef, position, caption, timestamp }
  BIMModel (generated Fragments/IFC binary)
```

### 2D Editor UX Design

Optimized for tablet/smartphone with seconds-long interaction bursts:

- **Tap-tap wall creation**: Tap start point, tap end point -> wall created
- **Auto-snap**: 15cm grid + existing wall endpoints + right angles
- **Mode toolbar** (bottom): Wall | Door | Window | Annotate | Photo | Cable | Select
- **Single-tap actions**: Tap wall to place door/window, tap empty space for annotation
- **Persistent undo/redo** buttons always visible (top bar)
- **Auto-save** every change immediately to IndexedDB
- **Large touch targets**: Minimum 48px for all interactive elements
- **Quick floor copy**: "Copy layout from floor X" button
- **Pinch to zoom**, two-finger pan for navigation
- **No modal dialogs** during sketching - properties edited inline or in slide-up panel

### Offline Strategy

1. **Pre-site prep (office, online)**:
   - Create project, enter address
   - OSM building footprint + map tiles cached automatically for surrounding area
   - Building model started (exterior walls, floor count)

2. **On-site (offline)**:
   - Full functionality without internet
   - All data saved to IndexedDB/OPFS immediately
   - Camera integration for photos (stored as blobs in OPFS)
   - GPS for positioning if available

3. **Post-site (office, online)**:
   - Manual sync when ready (no auto-sync)
   - Export to IFC for other BIM tools
   - Generate deliverables (future phases)

### OSM Integration

- Use Overpass API to query building footprints by address/coordinates
- Extract: building outline polygon, floor count (building:levels tag), building height
- Cache response in IndexedDB for offline use
- Fallback: manual sketch if OSM data unavailable

### 3D BIM Generation

- Extrude 2D floor plans into 3D walls (footprint polygon x floor height)
- Stack floors with configurable heights
- Place doors/windows as openings in wall geometry
- Use @thatopen/fragments format for efficient rendering
- Export to IFC for interoperability with other BIM software

## Future Phases (Not in MVP)

- Wireless signal simulation (coverage heatmaps)
- Bill of Materials generation
- City work permit document generation
- Labor plan and final quote
- Bid documentation with 3D renderings
- Multi-user collaboration and sync
- Backend API for project storage/sharing
- Vertical 2D section views for inter-floor cable routing

## Key Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Three.js performance on mobile | Use Fragments format (optimized for large datasets), limit geometry complexity |
| Offline map tiles storage size | Cache only ~1km radius around building, ~50MB per site |
| Touch input precision | Aggressive snap grid, large touch targets, undo always available |
| OSM data quality varies | Always allow manual override/sketch, OSM data is starting point only |
| PWA limitations on iOS | Test early on Safari, use OPFS polyfill if needed |
