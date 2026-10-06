/**
 * Reverse Geocoding Service
 * Converts latitude and longitude coordinates into exact physical street address,
 * area/neighborhood, city, postal code, and region.
 */
const reverseGeoCache = new Map();

async function reverseGeocode(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (isNaN(latitude) || isNaN(longitude)) return null;

  // Round to 4 decimal places (~11 meters) for cache key
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (reverseGeoCache.has(cacheKey)) {
    return reverseGeoCache.get(cacheKey);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EphemeralSecretVault-GeoResolver/2.0 (security-monitoring)'
      },
      signal: controller?.signal
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;

    const addr = data.address || {};
    const street = addr.road || addr.street || addr.pedestrian || addr.building || null;
    const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.subdistrict || null;
    const city = addr.city || addr.town || addr.village || addr.county || null;
    const postcode = addr.postcode || null;
    const state = addr.state || null;
    const country = addr.country || null;

    const parts = [street, area, city, postcode, state, country].filter(Boolean);
    const formatted = parts.length > 0 ? parts.join(', ') : (data.display_name || null);

    const result = {
      formatted: formatted || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      street,
      area,
      city: city || 'Unknown City',
      state: state || 'Unknown State',
      postcode,
      country: country || 'Unknown Country'
    };

    reverseGeoCache.set(cacheKey, result);
    return result;
  } catch (_) {
    if (timeoutId) clearTimeout(timeoutId);
    return null;
  }
}

module.exports = {
  reverseGeocode
};
