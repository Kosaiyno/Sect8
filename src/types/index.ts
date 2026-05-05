export interface Property {
  id: string;
  address: string;
  price?: number;
  purchasePrice?: number | null;
  bedrooms: number;
  bathrooms?: number | null;
  image?: string | null;
  estimatedRent?: number;
  estRent?: number;
  section8Cap?: number;
  fmr?: number;
  fmrSource?: string;
  locationScore?: number | null;
  description?: string;
  propertyType?: string | null;
  squareFootage?: number | null;
  zip?: string;
  url?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface Recommendation extends Property {
  effectiveRent?: number;
  cashflow?: number;
  roi?: number;
  reasoning?: string;
  explanation?: string;
  annualRent?: number;
  annualCashflow?: number;
  estExpenses?: number;
  netOperating?: number;
  capRate?: number | null;
  listingType?: string;
  source?: string;
  timestamp: number;
  verifiableProof?: string;
}

export interface AgentMemory {
  agentId: string;
  lastScanTimestamp: number;
  preferences: {
    minRoi: number;
    preferredLocations: string[];
  };
  history: string[];
  lastStorageCid?: string;
}

export interface OnChainLog {
  txHash: string;
  timestamp: number;
  agentId: string;
  propertyId: string;
  decision: string;
}
