export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
  })}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'BuildConnect/1.0' },
  });

  if (!response.ok) return null;

  const results = await response.json();
  if (!results.length) return null;

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}
