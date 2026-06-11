export interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    quarter?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    county?: string;
    state?: string;
  };
}

export const searchAddress = async (query: string): Promise<NominatimResult[]> => {
  if (!query.trim() || query.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query + ' Việt Nam')}&` +
    `format=json&addressdetails=1&limit=5&countrycodes=vn`;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'vi', 'User-Agent': 'TroApp/1.0' },
  });

  return await res.json();
};

export const reverseGeocode = async (lat: number, lon: number): Promise<NominatimResult | null> => {
  const url = `https://nominatim.openstreetmap.org/reverse?` +
    `lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'vi', 'User-Agent': 'TroApp/1.0' },
  });

  return await res.json();
};