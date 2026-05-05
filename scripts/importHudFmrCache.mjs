import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const HUD_API_BASE = 'https://www.huduser.gov/hudapi/public/fmr/statedata';
const OUTPUT_PATH = path.resolve(process.cwd(), 'data', 'hud-fmr-cache.json');
const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA',
  'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME',
  'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM',
  'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
  'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY',
];

function parseHudNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

async function fetchStateFmr(stateCode, token) {
  const response = await fetch(`${HUD_API_BASE}/${stateCode}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HUD request failed for ${stateCode} with status ${response.status}`);
  }

  const payload = await response.json();
  const data = payload?.data || {};
  const counties = Array.isArray(data.counties) ? data.counties : [];

  return {
    year: data.year || null,
    counties: counties.map((entry) => ({
      county_name: entry.county_name ? String(entry.county_name) : null,
      fips_code: entry.fips_code ? String(entry.fips_code) : null,
      Efficiency: parseHudNumber(entry.Efficiency),
      'One-Bedroom': parseHudNumber(entry['One-Bedroom']),
      'Two-Bedroom': parseHudNumber(entry['Two-Bedroom']),
      'Three-Bedroom': parseHudNumber(entry['Three-Bedroom']),
      'Four-Bedroom': parseHudNumber(entry['Four-Bedroom']),
    })),
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = [];
  let index = 0;

  async function next() {
    if (index >= items.length) {
      return;
    }

    const currentIndex = index;
    index += 1;
    results[currentIndex] = await worker(items[currentIndex], currentIndex);
    await next();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function main() {
  const token = process.env.HUD_USER_API_TOKEN?.trim();
  if (!token) {
    throw new Error('HUD_USER_API_TOKEN is required to build the bundled HUD FMR cache.');
  }

  console.log(`Fetching HUD FMR data for ${STATE_CODES.length} states...`);

  const states = {};
  const results = await mapWithConcurrency(STATE_CODES, 4, async (stateCode) => {
    const data = await fetchStateFmr(stateCode, token);
    console.log(`Fetched ${stateCode} (${Array.isArray(data.counties) ? data.counties.length : 0} counties)`);
    return { stateCode, data };
  });

  for (const result of results) {
    states[result.stateCode] = result.data;
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), states }, null, 2));
  console.log(`Wrote bundled HUD FMR cache to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});