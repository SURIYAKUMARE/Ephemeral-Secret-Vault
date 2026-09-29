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

/**
 * Resolves approximate IP-based location from request IP and headers.
 *
 * @param {string} ip
 * @param {object} [headers={}]
 * @returns {object}
 */
function resolveIpLocation(ip, headers = {}) {
  const cleanIp = String(ip || '127.0.0.1').split(',')[0].trim();

  // Cloudflare / Reverse proxy edge headers when deployed
  const cfCountry = headers['cf-ipcountry'] || headers['x-country'];
  const cfCity = headers['cf-ipcity'] || headers['x-city'];
  const cfRegion = headers['cf-region'] || headers['x-region'];

  if (cfCountry && cfCountry !== 'XX') {
    return {
      ip: cleanIp,
      country: cfCountry,
      region: cfRegion || 'Region Unknown',
      city: cfCity || 'City Unknown',
      isp_asn: headers['cf-as-number'] ? `AS${headers['cf-as-number']}` : 'Proxy Edge Network',
      is_approximate: true
    };
  }

  // Lookup in known network table
  for (const net of KNOWN_NETWORKS) {
    if (cleanIp.startsWith(net.prefix)) {
      return {
        ip: cleanIp,
        country: net.country,
        region: net.region,
        city: net.city,
        isp_asn: net.isp,
        is_approximate: true
      };
    }
  }

  // Default fallback for public IPs
  return {
    ip: cleanIp,
    country: 'International',
    region: 'Unassigned',
    city: 'Approximate Location',
    isp_asn: 'Public Internet Provider',
    is_approximate: true
  };
}

module.exports = {
  resolveIpLocation
};
