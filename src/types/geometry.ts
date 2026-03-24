export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [[lng, lat], ...]
}
