/** Approximate country centroids [lat, lng] for map markers (equirectangular). */
const COUNTRY_COORDS = {
  afghanistan: [33.9, 67.7],
  albania: [41.1, 20.2],
  algeria: [28, 3],
  argentina: [-38.4, -63.6],
  australia: [-25.3, 133.8],
  austria: [47.5, 14.6],
  bangladesh: [23.7, 90.4],
  belgium: [50.5, 4.5],
  brazil: [-14.2, -51.9],
  canada: [56.1, -106.3],
  chile: [-35.7, -71.5],
  china: [35.9, 104.2],
  colombia: [4.6, -74.3],
  croatia: [45.1, 15.2],
  czechia: [49.8, 15.5],
  "czech republic": [49.8, 15.5],
  denmark: [56.3, 9.5],
  egypt: [26.8, 30.8],
  finland: [61.9, 25.7],
  france: [46.2, 2.2],
  germany: [51.2, 10.5],
  greece: [39.1, 21.8],
  hongkong: [22.3, 114.2],
  "hong kong": [22.3, 114.2],
  hungary: [47.2, 19.5],
  india: [20.6, 78.9],
  indonesia: [-0.8, 113.9],
  iran: [32.4, 53.7],
  iraq: [33.2, 43.7],
  ireland: [53.4, -8.2],
  israel: [31, 34.9],
  italy: [41.9, 12.6],
  japan: [36.2, 138.3],
  kenya: [-0.02, 37.9],
  malaysia: [4.2, 101.9],
  mexico: [23.6, -102.5],
  morocco: [31.8, -7.1],
  netherlands: [52.1, 5.3],
  "new zealand": [-40.9, 174.9],
  nigeria: [9.1, 8.7],
  norway: [60.5, 8.5],
  pakistan: [30.4, 69.3],
  peru: [-9.2, -75],
  philippines: [12.9, 121.8],
  poland: [51.9, 19.1],
  portugal: [39.4, -8.2],
  romania: [45.9, 24.9],
  russia: [61.5, 105.3],
  "saudi arabia": [23.9, 45.1],
  singapore: [1.35, 103.8],
  "south africa": [-30.6, 22.9],
  "south korea": [35.9, 127.8],
  korea: [35.9, 127.8],
  spain: [40.5, -3.7],
  sweden: [60.1, 18.6],
  switzerland: [46.8, 8.2],
  taiwan: [23.7, 121],
  thailand: [15.9, 100.9],
  turkey: [38.9, 35.2],
  uae: [23.4, 53.8],
  "united arab emirates": [23.4, 53.8],
  uk: [55.4, -3.4],
  "united kingdom": [55.4, -3.4],
  "great britain": [55.4, -3.4],
  england: [52.4, -1.5],
  usa: [39.8, -98.6],
  "united states": [39.8, -98.6],
  "united states of america": [39.8, -98.6],
  ukraine: [48.4, 31.2],
  vietnam: [14.1, 108.8]
};

const UNKNOWN_NAMES = new Set(["unknown", "", "n/a", "na", "null", "none"]);

export function normalizeCountryKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

export function isUnknownCountry(name) {
  return UNKNOWN_NAMES.has(normalizeCountryKey(name));
}

export function getCountryCoords(countryName) {
  const key = normalizeCountryKey(countryName);
  if (!key || isUnknownCountry(key)) return null;
  const hit = COUNTRY_COORDS[key];
  if (hit) return { lat: hit[0], lng: hit[1] };
  return null;
}

/** Equirectangular projection for SVG viewBox 1000 x 500. */
export function projectLatLng(lat, lng, width = 1000, height = 500) {
  const x = ((Number(lng) + 180) / 360) * width;
  const y = ((90 - Number(lat)) / 180) * height;
  return { x, y };
}
