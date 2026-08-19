/** GeoJSON Point used by cart/order drop-pin checks: [lng, lat]. */
export type DropPin = {
  dropLat: number;
  dropLng: number;
};

export function parseDropPin(lat?: unknown, lng?: unknown): DropPin | null {
  const dropLat = typeof lat === 'number' ? lat : Number(lat);
  const dropLng = typeof lng === 'number' ? lng : Number(lng);
  if (!Number.isFinite(dropLat) || !Number.isFinite(dropLng)) return null;
  if (dropLat === 0 && dropLng === 0) return null;
  if (dropLat < -90 || dropLat > 90 || dropLng < -180 || dropLng > 180) {
    return null;
  }
  return { dropLat, dropLng };
}

export function geoPointFromPin(pin: DropPin): {
  type: 'Point';
  coordinates: [number, number];
} {
  return { type: 'Point', coordinates: [pin.dropLng, pin.dropLat] };
}
