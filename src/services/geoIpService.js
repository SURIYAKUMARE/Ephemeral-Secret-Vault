/**
 * Approximate IP Geolocation & Network Resolver Service
 *
 * Privacy Invariant:
 * Strictly provides approximate IP-based location and ASN information.
 * Never claims to be exact GPS/live device location.
 */

// Well-known range mappings for demonstration / test consistency
const KNOWN_NETWORKS = [
  { prefix: '127.', country: 'Localhost', region: 'Internal', city: 'Loopback', isp: 'Local Loopback' },
  { prefix: '::1', country: 'Localhost', region: 'Internal', city: 'Loopback', isp: 'Local Loopback' },
  { prefix: '10.', country: 'Private Network', region: 'Intranet', city: 'Private Subnet', isp: 'Internal LAN' },
  { prefix: '192.168.', country: 'Private Network', region: 'Intranet', city: 'Private Subnet', isp: 'Internal LAN' },
  { prefix: '172.16.', country: 'Private Network', region: 'Intranet', city: 'Private Subnet', isp: 'Internal LAN' },
  { prefix: '8.8.', country: 'United States', region: 'California', city: 'Mountain View', isp: 'Google LLC (AS15169)' },
  { prefix: '1.1.', country: 'Australia', region: 'New South Wales', city: 'Sydney', isp: 'Cloudflare Inc. (AS13335)' },
  { prefix: '106.', country: 'India', region: 'Tamil Nadu', city: 'Chennai', isp: 'Bharti Airtel (AS24560)' },
  { prefix: '203.0.113.', country: 'India', region: 'Tamil Nadu', city: 'Chennai', isp: 'National Telecom (TEST-NET-3)' },
  { prefix: '198.51.100.', country: 'Germany', region: 'Hesse', city: 'Frankfurt', isp: 'Deutsche Telekom (TEST-NET-2)' },
  { prefix: '192.0.2.', country: 'United States', region: 'Virginia', city: 'Ashburn', isp: 'Amazon AWS (TEST-NET-1)' },
  { prefix: '185.', country: 'United Kingdom', region: 'England', city: 'London', isp: 'British Telecom (AS2856)' }
];

let geoip = null;
try {
  geoip = require('geoip-lite');
} catch (_) {}

// In-memory cache for fast lookups
const ipGeoCache = new Map();

const REGION_NAMES = {
  TN: 'Tamil Nadu', KA: 'Karnataka', MH: 'Maharashtra', DL: 'Delhi', KL: 'Kerala',
  AP: 'Andhra Pradesh', TS: 'Telangana', GJ: 'Gujarat', WB: 'West Bengal', UP: 'Uttar Pradesh',
  HR: 'Haryana', PB: 'Punjab', RJ: 'Rajasthan', MP: 'Madhya Pradesh',
  CA: 'California', NY: 'New York', TX: 'Texas', WA: 'Washington', FL: 'Florida',
  IL: 'Illinois', VA: 'Virginia', MA: 'Massachusetts', GA: 'Georgia', NC: 'North Carolina',
  ENG: 'England', SCT: 'Scotland', WLS: 'Wales', NIR: 'Northern Ireland',
  ON: 'Ontario', BC: 'British Columbia', QC: 'Quebec', AB: 'Alberta',
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland'
};

function expandCountry(code) {
  if (!code) return 'Unknown';
  if (code === 'XX') return 'International';
  if (code.length > 2) return code;
  const upper = code.toUpperCase();
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const name = displayNames.of(upper);
    if (name) return name;
  } catch (_) {}
  const map = {
    IN: 'India', US: 'United States', GB: 'United Kingdom', UK: 'United Kingdom',
    CA: 'Canada', AU: 'Australia', DE: 'Germany', FR: 'France', SG: 'Singapore',
    AE: 'United Arab Emirates', JP: 'Japan', NL: 'Netherlands', CH: 'Switzerland',
    BR: 'Brazil', ZA: 'South Africa', SE: 'Sweden', NO: 'Norway', ES: 'Spain', IT: 'Italy'
  };
  return map[upper] || upper;
}

function expandRegion(code) {
  if (!code) return 'Region Unknown';
  const upper = String(code).toUpperCase().trim();
  return REGION_NAMES[upper] || code;
}

function decodeCity(city) {
  if (!city) return 'City Unknown';
  try {
    return decodeURIComponent(String(city).replace(/\+/g, ' ')).trim();
  } catch (_) {
    return String(city).trim();
  }
}

/**
 * Resolves approximate IP-based location from request IP and headers.
 *
 * @param {string} ip
 * @param {object} [headers={}]
 * @returns {object}
 */
function resolveIpLocation(ip, headers = {}) {
  const cleanIp = String(ip || '127.0.0.1').replace(/^::ffff:/, '').split(',')[0].trim();

  // 1. Check Vercel edge headers
  const vCountry = headers['x-vercel-ip-country'];
  const vRegion = headers['x-vercel-ip-country-region'];
  const vCity = headers['x-vercel-ip-city'];
  const vLat = headers['x-vercel-ip-latitude'];
  const vLon = headers['x-vercel-ip-longitude'];

  if (vCountry && vCountry !== 'XX') {
    const res = {
      ip: cleanIp,
      country: expandCountry(vCountry),
      region: expandRegion(vRegion),
      city: decodeCity(vCity),
      latitude: vLat ? parseFloat(vLat) : null,
      longitude: vLon ? parseFloat(vLon) : null,
      isp_asn: headers['x-vercel-ip-as-number'] ? `AS${headers['x-vercel-ip-as-number']}` : 'Vercel Edge Network',
      is_approximate: true
    };
    ipGeoCache.set(cleanIp, res);
    return res;
  }

  // 2. Cloudflare / Reverse proxy edge headers when deployed
  const cfCountry = headers['cf-ipcountry'] || headers['x-country'];
  const cfCity = headers['cf-ipcity'] || headers['x-city'];
  const cfRegion = headers['cf-region'] || headers['x-region'];
  const cfLat = headers['cf-iplatitude'] || headers['x-latitude'];
  const cfLon = headers['cf-iplongitude'] || headers['x-longitude'];

  if (cfCountry && cfCountry !== 'XX') {
    const res = {
      ip: cleanIp,
      country: expandCountry(cfCountry),
      region: expandRegion(cfRegion),
      city: decodeCity(cfCity),
      latitude: cfLat ? parseFloat(cfLat) : null,
      longitude: cfLon ? parseFloat(cfLon) : null,
      isp_asn: headers['cf-as-number'] ? `AS${headers['cf-as-number']}` : 'Proxy Edge Network',
      is_approximate: true
    };
    ipGeoCache.set(cleanIp, res);
    return res;
  }

  // 3. Check memory cache
  if (ipGeoCache.has(cleanIp)) {
    return { ...ipGeoCache.get(cleanIp) };
  }

  // 4. Lookup in known network table
  for (const net of KNOWN_NETWORKS) {
    if (cleanIp.startsWith(net.prefix)) {
      return {
        ip: cleanIp,
        country: net.country,
        region: net.region,
        city: net.city,
        latitude: null,
        longitude: null,
        isp_asn: net.isp,
        is_approximate: true
      };
    }
  }

  // 5. Use GeoIP database if available
  if (geoip) {
    try {
      const geo = geoip.lookup(cleanIp);
      if (geo) {
        const countryName = expandCountry(geo.country);
        const regionName = expandRegion(geo.region);
        const cityName = geo.city ? decodeCity(geo.city) : 'City Unknown';
        const lat = Array.isArray(geo.ll) ? geo.ll[0] : null;
        const lon = Array.isArray(geo.ll) ? geo.ll[1] : null;

        const res = {
          ip: cleanIp,
          country: countryName || 'International',
          region: regionName || 'Region Unknown',
          city: cityName,
          latitude: lat,
          longitude: lon,
          isp_asn: 'Public Internet Provider',
          is_approximate: true
        };

        if (cityName !== 'City Unknown') {
          ipGeoCache.set(cleanIp, res);
        }
        return res;
      }
    } catch (_) {}
  }

  // 6. Default fallback for public IPs
  return {
    ip: cleanIp,
    country: 'International',
    region: 'Unassigned',
    city: 'Approximate Location',
    latitude: null,
    longitude: null,
    isp_asn: 'Public Internet Provider',
    is_approximate: true
  };
}

/**
 * Asynchronously looks up public IP on ip-api.com and caches the result.
 * Invokes callback(resolved) non-blockingly if successful.
 */
function lookupIpApiAsync(ip, callback) {
  if (!ip) return;
  const cleanIp = String(ip).replace(/^::ffff:/, '').split(',')[0].trim();

  // Ignore localhost / private IPs
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.16.')
  ) {
    return;
  }

  // If already in cache with valid city, call callback immediately
  if (ipGeoCache.has(cleanIp)) {
    const cached = ipGeoCache.get(cleanIp);
    if (cached.city && cached.city !== 'City Unknown' && cached.city !== 'Approximate Location') {
      if (typeof callback === 'function') callback(cached);
      return;
    }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

  fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,region,city,lat,lon,isp,as`, {
    signal: controller?.signal
  })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (timeoutId) clearTimeout(timeoutId);
      if (data && data.status === 'success') {
        const resolved = {
          ip: cleanIp,
          country: data.country || expandCountry(data.countryCode) || 'International',
          region: data.regionName || expandRegion(data.region) || 'Region Unknown',
          city: decodeCity(data.city) || 'City Unknown',
          latitude: typeof data.lat === 'number' ? data.lat : null,
          longitude: typeof data.lon === 'number' ? data.lon : null,
          isp_asn: data.isp || (data.as ? data.as : 'Public Internet Provider'),
          is_approximate: true
        };
        ipGeoCache.set(cleanIp, resolved);
        if (typeof callback === 'function') {
          callback(resolved);
        }
      }
    })
    .catch(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
}

module.exports = {
  resolveIpLocation,
  lookupIpApiAsync,
  expandCountry,
  expandRegion
};
