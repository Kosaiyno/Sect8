import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

const SOURCE_PAGES = [
  'https://www.hud.gov/contactus/public-housing-contacts',
  'https://www.hud.gov/program_offices/public_indian_housing/pha/contacts',
];
const OUTPUT_PATH = path.resolve(process.cwd(), 'data', 'pha-directory.json');
const STATE_OPTION_REGEX = /<option[^>]+value="([^"]*PHA_Contact_Report_[A-Z]{2}\.pdf)"[^>]*>\s*([^<]+?)\s*<\/option>/gi;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\(\d{3}\)\d{3}-\d{4}(?:\s*x\d+)?/g;
const STATE_ZIP_REGEX = /^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
const TYPE_REGEX = /(Section 8|Low-Rent|Combined)/i;

const zipMetadataCache = new Map();
const countyCache = new Map();

function normalizeAbsoluteUrl(url) {
  return url.startsWith('http') ? url : new URL(url, 'https://www.hud.gov').toString();
}

async function fetchStateReports() {
  for (const sourcePage of SOURCE_PAGES) {
    const response = await fetch(sourcePage);
    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    const reports = [];
    let match = STATE_OPTION_REGEX.exec(html);
    while (match) {
      reports.push({
        stateName: match[2].trim(),
        url: normalizeAbsoluteUrl(match[1].trim()),
      });
      match = STATE_OPTION_REGEX.exec(html);
    }

    if (reports.length) {
      return { sourcePage, reports };
    }

    STATE_OPTION_REGEX.lastIndex = 0;
  }

  throw new Error('HUD source page did not expose any state PHA PDF reports');
}

function cleanPdfLines(text) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => line !== 'PHA Contact Information')
    .filter((line) => line !== 'This listing is ordered by city and based on the information in IMS/PIC system.')
    .filter((line) => line !== 'PHA Code Name, Phone, Fax, Email Physical Address Type')
    .filter((line) => !/^--\s+\d+\s+of\s+\d+\s+--$/.test(line));
}

function collectBlocks(lines) {
  const blocks = [];
  let current = [];

  for (const line of lines) {
    if (/^[A-Z]{2}\d{3}\b/.test(line)) {
      if (current.length) {
        blocks.push(current);
      }
      current = [line];
      continue;
    }

    if (!current.length) {
      continue;
    }

    current.push(line);
  }

  if (current.length) {
    blocks.push(current);
  }

  return blocks;
}

function parseBlock(block, sourceUrl) {
  const raw = block.join('\n');
  const code = raw.match(/\b[A-Z]{2}\d{3}\b/)?.[0] || null;
  if (!code) {
    return null;
  }

  const phones = raw.match(PHONE_REGEX) || [];
  const email = raw.match(EMAIL_REGEX)?.[0] || null;
  const cleanedLines = block
    .map((line) => line.replace(code, '').trim())
    .filter(Boolean)
    .filter((line) => line !== ',' && line !== 'Phone:' && line !== 'Fax:' && line !== 'Email:');

  const addressParts = [];
  let city = null;
  let state = null;
  let zip = null;
  let programType = null;
  let name = null;

  for (const line of cleanedLines) {
    if (EMAIL_REGEX.test(line) || PHONE_REGEX.test(line)) {
      EMAIL_REGEX.lastIndex = 0;
      PHONE_REGEX.lastIndex = 0;
      continue;
    }
    EMAIL_REGEX.lastIndex = 0;
    PHONE_REGEX.lastIndex = 0;

    const stateZipMatch = line.match(STATE_ZIP_REGEX);
    if (stateZipMatch) {
      state = stateZipMatch[1].toUpperCase();
      zip = stateZipMatch[2];
      city = addressParts.pop() || null;
      continue;
    }

    const typeMatch = line.match(TYPE_REGEX);
    if (typeMatch) {
      programType = typeMatch[1];
      const beforeType = line.slice(0, typeMatch.index).trim();
      if (beforeType) {
        addressParts.push(beforeType);
      }
      const afterType = line.slice((typeMatch.index || 0) + typeMatch[0].length).trim();
      if (afterType) {
        name = afterType;
      }
      continue;
    }

    addressParts.push(line);
  }

  if (!name) {
    name = addressParts.pop() || null;
  }

  if (!city && addressParts.length > 1) {
    city = addressParts.pop() || null;
  }

  return {
    code,
    name: name || code,
    programType: programType || null,
    phone: phones[0] || null,
    fax: phones[1] || null,
    email,
    address: addressParts.join(', ') || null,
    city,
    state: state || code.slice(0, 2),
    zip,
    countyFips: null,
    countyName: null,
    sourceUrl,
  };
}

async function fetchZipMetadata(zipCode) {
  if (!zipCode) {
    return null;
  }

  if (!zipMetadataCache.has(zipCode)) {
    zipMetadataCache.set(zipCode, (async () => {
      const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const place = Array.isArray(data.places) ? data.places[0] : null;
      if (!place?.latitude || !place?.longitude) {
        return null;
      }

      return {
        latitude: String(place.latitude),
        longitude: String(place.longitude),
      };
    })());
  }

  return zipMetadataCache.get(zipCode);
}

async function fetchCounty(zipCode) {
  if (!zipCode) {
    return null;
  }

  if (!countyCache.has(zipCode)) {
    countyCache.set(zipCode, (async () => {
      const metadata = await fetchZipMetadata(zipCode);
      if (!metadata) {
        return null;
      }

      const response = await fetch(`https://geo.fcc.gov/api/census/block/find?latitude=${metadata.latitude}&longitude=${metadata.longitude}&format=json`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data?.County?.FIPS
        ? {
            fips: String(data.County.FIPS),
            name: data.County.name ? String(data.County.name) : null,
          }
        : null;
    })());
  }

  return countyCache.get(zipCode);
}

async function parseStateReport(report) {
  const parser = new PDFParse({ url: report.url });
  const result = await parser.getText();
  await parser.destroy();

  const entries = [];
  for (const block of collectBlocks(cleanPdfLines(result.text))) {
    const parsed = parseBlock(block, report.url);
    if (!parsed?.zip) {
      continue;
    }

    const county = await fetchCounty(parsed.zip);
    entries.push({
      ...parsed,
      countyFips: county?.fips || null,
      countyName: county?.name || null,
      state: parsed.state || report.url.match(/_([A-Z]{2})\.pdf$/)?.[1] || 'NA',
    });
  }

  return entries;
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
  return results.flat();
}

async function main() {
  const { sourcePage, reports } = await fetchStateReports();
  const entries = await mapWithConcurrency(reports, 4, parseStateReport);
  const deduped = Array.from(new Map(entries.map((entry) => [`${entry.code}:${entry.zip}:${entry.name}`, entry])).values());

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourcePage,
        entries: deduped,
      },
      null,
      2,
    ),
  );

  console.log(`Wrote ${deduped.length} PHA contacts to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});