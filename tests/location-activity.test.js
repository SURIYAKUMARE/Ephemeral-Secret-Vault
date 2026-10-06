const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { getDb } = require('../src/database/db');
const { resolveIpLocation } = require('../src/services/geoIpService');
const { getFileAccessActivity } = require('../src/services/accessMonitorService');

describe('Location & Recipient Activity Geolocation Test Suite', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  test('Vercel Edge Headers: accurately resolves city, region, country, and coordinates', () => {
    const headers = {
      'x-vercel-ip-country': 'IN',
      'x-vercel-ip-country-region': 'TN',
      'x-vercel-ip-city': 'Coimbatore',
      'x-vercel-ip-latitude': '11.0168',
      'x-vercel-ip-longitude': '76.9558',
      'x-vercel-ip-as-number': '7633'
    };

    const resolved = resolveIpLocation('164.164.199.18', headers);
    assert.equal(resolved.country, 'India');
    assert.equal(resolved.region, 'Tamil Nadu');
    assert.equal(resolved.city, 'Coimbatore');
    assert.equal(resolved.latitude, 11.0168);
    assert.equal(resolved.longitude, 76.9558);
    assert.equal(resolved.is_approximate, true);
  });

  test('URL-Encoded Cities: properly decodes encoded city names in headers', () => {
    const headers = {
      'x-vercel-ip-country': 'US',
      'x-vercel-ip-country-region': 'CA',
      'x-vercel-ip-city': 'San%20Francisco',
      'x-vercel-ip-latitude': '37.7749',
      'x-vercel-ip-longitude': '-122.4194'
    };

    const resolved = resolveIpLocation('192.0.2.1', headers);
    assert.equal(resolved.country, 'United States');
    assert.equal(resolved.city, 'San Francisco');
    assert.equal(resolved.region, 'California');
  });

  test('Recipient Activity Endpoint: returns location_display and google_maps_url when secret is revealed', async () => {
    // 1. Create a secret
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'COIMBATORE_LOCATION_TEST', ttl_seconds: 3600, max_views: 1 })
    });
    const { id } = await createRes.json();
    assert.ok(id);

    // 2. Open secret view (records initial OPENED access event)
    await fetch(`${baseUrl}/secret/${id}`, {
      headers: {
        'x-vercel-ip-country': 'IN',
        'x-vercel-ip-country-region': 'TN',
        'x-vercel-ip-city': 'Coimbatore',
        'x-vercel-ip-latitude': '11.0168',
        'x-vercel-ip-longitude': '76.9558'
      }
    });

    // 3. Burn secret with voluntary consented GPS coordinates
    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-ip-country': 'IN',
        'x-vercel-ip-city': 'Coimbatore'
      },
      body: JSON.stringify({
        location_source: 'gps',
        gps_lat: 11.01684,
        gps_long: 76.95582,
        gps_accuracy_m: 15
      })
    });
    assert.equal(burnRes.status, 200);

    // 4. Query recipient activity endpoint
    const actRes = await fetch(`${baseUrl}/api/vault/${id}/activity`);
    assert.equal(actRes.status, 200);
    const actData = await actRes.json();

    assert.ok(actData.latest_access, 'latest_access must exist');
    const latest = actData.latest_access;
    assert.ok(latest.location_display.includes('Coimbatore') || latest.location_display.includes('India'));
    assert.ok(latest.google_maps_url, 'google_maps_url must be generated');
    assert.ok(latest.google_maps_url.includes('11.0168'));
    assert.ok(latest.google_maps_url.includes('76.9558'));
    assert.equal(latest.location_source, 'gps');
    assert.equal(latest.access_status, 'REVEALED');
  });

  test('Voluntary Location Transmission Endpoint: records exact coordinates and reverse-geocoded address', async () => {
    // 1. Create a secret
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'EXACT_LOCATION_TEST', ttl_seconds: 3600, max_views: 1 })
    });
    const { id } = await createRes.json();
    assert.ok(id);

    // 2. Open secret view
    await fetch(`${baseUrl}/secret/${id}`);

    // 3. Post voluntary GPS coordinates to /api/vault/:id/location
    const locRes = await fetch(`${baseUrl}/api/vault/${id}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 11.0168,
        longitude: 76.9558,
        accuracy: 12.5,
        location_source: 'gps',
        consent_granted: true
      })
    });
    assert.equal(locRes.status, 200);
    const locData = await locRes.json();
    assert.equal(locData.success, true);
    assert.ok(locData.exact_address);
    assert.ok(locData.google_maps_url);

    // 4. Query recipient activity endpoint
    const actRes = await fetch(`${baseUrl}/api/vault/${id}/activity`);
    assert.equal(actRes.status, 200);
    const actData = await actRes.json();
    assert.ok(actData.latest_access);
    assert.equal(actData.latest_access.location_source, 'gps');
    assert.ok(actData.latest_access.exact_address);
    assert.ok(actData.latest_access.google_maps_url.includes('11.0168'));
  });
});
