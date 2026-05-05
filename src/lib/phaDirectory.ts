import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { getCountyMetadata } from '@/lib/realDataService';

export type HousingAuthorityEntry = {
  code: string;
  name: string;
  programType: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  countyFips: string | null;
  countyName: string | null;
  sourceUrl: string;
};

export type HousingAuthorityMatch = {
  entry: HousingAuthorityEntry;
  matchedBy: 'zip' | 'city' | 'county' | 'state';
  score: number;
};

type HousingAuthorityDirectory = {
  generatedAt: string;
  sourcePage: string;
  entries: HousingAuthorityEntry[];
};

const phaDirectoryPath = path.resolve(process.cwd(), 'data', 'pha-directory.json');

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '');
}

function readDirectory(): HousingAuthorityDirectory | null {
  if (!fs.existsSync(phaDirectoryPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(phaDirectoryPath, 'utf8')) as HousingAuthorityDirectory;
  } catch {
    return null;
  }
}

function parseListingLocation(address: string | null | undefined) {
  const [street = '', city = '', stateZip = ''] = String(address || '').split(',').map((part) => part.trim());
  const stateZipMatch = stateZip.match(/^([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/i);

  return {
    street: street || null,
    city: city || null,
    state: stateZipMatch?.[1]?.toUpperCase() || null,
    zip: stateZipMatch?.[2] || null,
  };
}

export async function resolveHousingAuthorityContact(params: {
  address?: string | null;
  zipCode?: string | null;
}) {
  const directory = readDirectory();
  if (!directory?.entries?.length) {
    return null;
  }

  const parsed = parseListingLocation(params.address);
  const zipCode = String(params.zipCode || parsed.zip || '').trim();
  const city = normalizeText(parsed.city);
  const state = String(parsed.state || '').trim().toUpperCase();
  const county = zipCode ? await getCountyMetadata(zipCode) : null;
  const countyName = normalizeText(county?.name);
  const countyFips = String(county?.fips || '');

  const candidates = directory.entries
    .filter((entry) => !state || entry.state === state)
    .map((entry) => {
      let score = 0;
      let matchedBy: HousingAuthorityMatch['matchedBy'] = 'state';

      if (zipCode && entry.zip === zipCode) {
        score += 100;
        matchedBy = 'zip';
      }

      if (city && normalizeText(entry.city) === city) {
        score += 60;
        matchedBy = matchedBy === 'zip' ? matchedBy : 'city';
      }

      if (countyFips && entry.countyFips === countyFips) {
        score += 40;
        matchedBy = matchedBy === 'zip' || matchedBy === 'city' ? matchedBy : 'county';
      } else if (countyName && normalizeText(entry.countyName) === countyName) {
        score += 30;
        matchedBy = matchedBy === 'zip' || matchedBy === 'city' ? matchedBy : 'county';
      }

      if (state && entry.state === state) {
        score += 10;
      }

      return { entry, matchedBy, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name));

  return candidates[0] || null;
}