export interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  image: string;
  estimatedRent: number;
  section8Cap: number;
  locationScore: number;
  description?: string;
}

export interface Recommendation extends Property {
  effectiveRent: number;
  cashflow: number;
  roi: number;
  reasoning: string;
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
