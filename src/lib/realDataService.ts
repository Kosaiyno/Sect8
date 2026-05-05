import axios from "axios";

type HudCountyEntry = {
  county_name?: string;
  fips_code?: string;
  Efficiency?: number | string;
  "One-Bedroom"?: number | string;
  "Two-Bedroom"?: number | string;
  "Three-Bedroom"?: number | string;
  "Four-Bedroom"?: number | string;
};

type HudStateResponse = {
  data?: {
    year?: string | number;
    counties?: HudCountyEntry[];
  };
};

type FairMarketRentResult = {
  value: number;
  source: "hud" | "modeled";
  areaName?: string | null;
};

export type ZipMetadata = {
  state: string;
  latitude: string;
  longitude: string;
};

export type CountyMetadata = {
  fips: string;
  name: string | null;
};

const zipMetadataCache = new Map<string, Promise<{ state: string; latitude: string; longitude: string } | null>>();
const countyFipsCache = new Map<string, Promise<{ fips: string; name: string | null } | null>>();
const hudStateCache = new Map<string, Promise<HudStateResponse | null>>();
const fairMarketRentCache = new Map<string, Promise<FairMarketRentResult>>();

// RentCast API wrapper
export const fetchRealProperties = async (zipCode: string, bedrooms: number) => {
  const apiKey = process.env.RENTCAST_API_KEY || process.env.NEXT_PUBLIC_RENTCAST_API_KEY;
  void bedrooms;
  
  if (!apiKey || apiKey === 'demo_key') {
    console.warn("Sect8: No RentCast API key found. Sale listings are unavailable.");
    return null;
  }

  try {
    const response = await axios.get(`https://api.rentcast.io/v1/listings/sale?zipCode=${zipCode}&status=active&limit=100`, {
      headers: { 'X-Api-Key': apiKey }
    });
    return response.data;
  } catch (error) {
    console.error("Sect8: Error fetching from RentCast API:", error);
    return null;
  }
};

export const getFMR = (zipCode: string, bedrooms: number): number => {
  const baseFMR = 1200;
  const zipHash = zipCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const multiplier = 1 + (zipHash % 50) / 100; // 1.0 to 1.5 multiplier
  const bedroomMultiplier = [1, 1.2, 1.5, 1.8, 2.2][bedrooms] || 1;
  
  return Math.round(baseFMR * multiplier * bedroomMultiplier);
};

export function normalizePropertyType(propertyType: unknown) {
  const rawType = String(propertyType || "Single Family").trim();
  return rawType === "Single Family Residence" ? "Single Family" : rawType;
}

export function isExcludedPropertyType(propertyType: unknown) {
  const normalized = normalizePropertyType(propertyType).toLowerCase();
  return normalized.includes("land") || normalized.includes("lot");
}

export function getValidatedPurchasePrice(rawPrice: number, estRent: number) {
  if (!Number.isFinite(rawPrice)) {
    return null;
  }

  return rawPrice >= Math.max(10000, estRent * 24) ? rawPrice : null;
}

async function fetchZipMetadata(zipCode: string) {
  if (!zipMetadataCache.has(zipCode)) {
    zipMetadataCache.set(zipCode, (async () => {
      try {
        const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
        if (!response.ok) {
          return null;
        }

        const data = await response.json() as {
          places?: Array<{
            latitude?: string;
            longitude?: string;
            ["state abbreviation"]?: string;
          }>;
        };

        const place = Array.isArray(data.places) ? data.places[0] : null;
        if (!place?.latitude || !place?.longitude || !place["state abbreviation"]) {
          return null;
        }

        return {
          state: String(place["state abbreviation"]),
          latitude: String(place.latitude),
          longitude: String(place.longitude),
        };
      } catch (error) {
        console.error("Sect8: Error fetching ZIP metadata:", error);
        return null;
      }
    })());
  }

  return zipMetadataCache.get(zipCode) || Promise.resolve(null);
}

export async function getZipMetadata(zipCode: string): Promise<ZipMetadata | null> {
  return fetchZipMetadata(zipCode);
}

async function fetchCountyFips(zipCode: string) {
  if (!countyFipsCache.has(zipCode)) {
    countyFipsCache.set(zipCode, (async () => {
      const metadata = await fetchZipMetadata(zipCode);
      if (!metadata) {
        return null;
      }

      try {
        const response = await fetch(`https://geo.fcc.gov/api/census/block/find?latitude=${metadata.latitude}&longitude=${metadata.longitude}&format=json`);
        if (!response.ok) {
          return null;
        }

        const data = await response.json() as {
          County?: { FIPS?: string; name?: string };
        };

        if (!data.County?.FIPS) {
          return null;
        }

        return {
          fips: String(data.County.FIPS),
          name: data.County.name ? String(data.County.name) : null,
        };
      } catch (error) {
        console.error("Sect8: Error fetching county FIPS:", error);
        return null;
      }
    })());
  }

  return countyFipsCache.get(zipCode) || Promise.resolve(null);
}

export async function getCountyMetadata(zipCode: string): Promise<CountyMetadata | null> {
  return fetchCountyFips(zipCode);
}

async function fetchHudStateData(stateCode: string) {
  const token = process.env.HUD_USER_API_TOKEN?.trim();
  if (!token) {
    return null;
  }

  if (!hudStateCache.has(stateCode)) {
    const request: Promise<HudStateResponse | null> = (async () => {
      try {
        const response = await fetch(`https://www.huduser.gov/hudapi/public/fmr/statedata/${stateCode}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          console.warn(`Sect8: HUD FMR request failed for ${stateCode} with status ${response.status}.`);
          return null;
        }

        return await response.json() as HudStateResponse;
      } catch (error) {
        console.error("Sect8: Error fetching HUD FMR data:", error);
        return null;
      }
    })();

    hudStateCache.set(stateCode, request);

    void request.then((result) => {
      if (!result) {
        hudStateCache.delete(stateCode);
      }
    });
  }

  return hudStateCache.get(stateCode) || Promise.resolve(null);
}

function getBedroomKey(bedrooms: number) {
  if (bedrooms <= 0) {
    return "Efficiency";
  }

  if (bedrooms === 1) {
    return "One-Bedroom";
  }

  if (bedrooms === 2) {
    return "Two-Bedroom";
  }

  if (bedrooms === 3) {
    return "Three-Bedroom";
  }

  return "Four-Bedroom";
}

function parseHudNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function getStateFromAddress(address?: string | null) {
  if (!address) {
    return null;
  }

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const stateZip = parts[parts.length - 1] || "";
  const [state] = stateZip.split(/\s+/);
  return state || null;
}

export async function getFairMarketRent(zipCode: string, bedrooms: number, address?: string | null): Promise<FairMarketRentResult> {
  const cacheKey = `${zipCode}:${bedrooms}`;

  if (!fairMarketRentCache.has(cacheKey)) {
    const request: Promise<FairMarketRentResult> = (async () => {
      const fallbackValue = getFMR(zipCode, bedrooms);
      const token = process.env.HUD_USER_API_TOKEN?.trim();
      if (!token) {
        return { value: fallbackValue, source: "modeled" };
      }

      const zipMetadata = await fetchZipMetadata(zipCode);
      const stateCode = getStateFromAddress(address) || zipMetadata?.state || null;
      const county = await fetchCountyFips(zipCode);

      if (!stateCode || !county?.fips) {
        return { value: fallbackValue, source: "modeled" };
      }

      const hudStateData = await fetchHudStateData(stateCode);
      const counties = Array.isArray(hudStateData?.data?.counties) ? hudStateData.data.counties : [];
      const countyEntry = counties.find((entry) => String(entry.fips_code || "").startsWith(county.fips));
      const hudValue = countyEntry ? parseHudNumber(countyEntry[getBedroomKey(bedrooms) as keyof HudCountyEntry]) : null;

      if (!hudValue) {
        return { value: fallbackValue, source: "modeled", areaName: county?.name || null };
      }

      return {
        value: hudValue,
        source: "hud",
        areaName: countyEntry?.county_name ? String(countyEntry.county_name) : county?.name || null,
      };
    })();

    fairMarketRentCache.set(cacheKey, request);

    void request.then((result) => {
      if (result.source !== "hud") {
        fairMarketRentCache.delete(cacheKey);
      }
    });
  }

  return fairMarketRentCache.get(cacheKey) || Promise.resolve({ value: getFMR(zipCode, bedrooms), source: "modeled" });
}
