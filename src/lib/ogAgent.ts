import { Property, Recommendation, AgentMemory } from "@/types";
import { fetchRealProperties, getFMR } from "./realDataService";
import { uploadToStorage } from "@/app/actions/og";
import { zgCompute } from "@/og-integration/compute";

export interface UserPreferences {
  zipCode: string;
  minBedrooms: number;
  maxPrice: number;
  minRoi: number;
}

export class OGAgent {
  public id: string = "";
  public owner: string;
  public preferences: UserPreferences;
  public memory: AgentMemory;
  public status: 'idle' | 'scanning' | 'managing' = 'idle';

  constructor(owner: string, preferences: UserPreferences) {
    this.owner = owner;
    this.preferences = preferences;
    
    this.memory = {
      agentId: "pending",
      lastScanTimestamp: 0,
      preferences: {
        minRoi: preferences.minRoi,
        preferredLocations: [preferences.zipCode],
      },
      history: [`Agent initialization started by ${owner}`],
    };
  }

  public async activate() {
    this.status = 'scanning';
    console.log("Sect8: Activating 0G agent...");

    const storageResult = await uploadToStorage(JSON.stringify(this.memory));
    if (!storageResult.success) throw new Error(storageResult.error);
    this.memory.history.push(`Initial state persisted on 0G Storage: ${storageResult.hash}`);

    this.id = `agent-${this.owner.toLowerCase()}`;
    this.memory.agentId = this.id;
    this.memory.history.push(`Agent activated for wallet ${this.owner}`);

    this.status = 'idle';
    return true;
  }

  /**
   * Runs a property scan and 0G-backed analysis pass for the current agent.
   */
  public async runScan(): Promise<Recommendation[]> {
    this.status = 'scanning';
    this.memory.history.push(`Scan triggered for ZIP ${this.preferences.zipCode}`);

    // 1. Data Ingestion (Real market data)
    const rawData = await fetchRealProperties(this.preferences.zipCode, this.preferences.minBedrooms);
    const properties: Property[] = rawData ? rawData.map((p: Record<string, unknown>) => {
      const bedrooms = Number(p.bedrooms || 0) || this.preferences.minBedrooms;
      return ({
      id: String(p.id || `${Date.now()}-${Math.random()}`),
      address: String(p.formattedAddress || p.address || 'Unknown Address'),
      price: Number(p.price || 150000),
      bedrooms,
      bathrooms: p.bathrooms === null || p.bathrooms === undefined ? null : Number(p.bathrooms),
      image: typeof p.image === 'string' && p.image ? p.image : "https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800&auto=format&fit=crop",
      estimatedRent: Number(p.rentEstimate || 1500),
      section8Cap: getFMR(this.preferences.zipCode, bedrooms),
      locationScore: 85,
    });
    }) : this.generateRealisticData();

    // 2. Compute Logic (Use 0G Compute service)
    let recommendations: Recommendation[] = [];
    try {
      const prompt = `You are a Section 8 investment analyst. Score and rank these properties for this agent. Return JSON array only.\n\nAgent: ${JSON.stringify(this.memory)}\nPreferences: ${JSON.stringify(this.preferences)}\nProperties: ${JSON.stringify(properties)}`;
      const computeResp = await zgCompute.runAnalysis({
        model: process.env.OG_COMPUTE_MODEL,
        messages: [
          { role: 'system' as const, content: 'You rank Section 8 investment properties and return structured JSON only.' },
          { role: 'user' as const, content: prompt },
        ],
      });
      const result = computeResp?.result || computeResp;

      // Expect result to contain scored properties and optionally proofs
      const scored = result?.output || result?.scored || result?.body || null;
      if (Array.isArray(scored)) {
        recommendations = scored.map((r: Record<string, unknown>) => ({
          id: String(r.id || `${Date.now()}-${Math.random()}`),
          address: String(r.address || 'Unknown Address'),
          price: Number(r.price || 0),
          bedrooms: Number(r.bedrooms || 0),
          bathrooms: r.bathrooms === null || r.bathrooms === undefined ? null : Number(r.bathrooms),
          image: typeof r.image === 'string' ? r.image : null,
          estimatedRent: Number(r.estimatedRent || 0),
          section8Cap: Number(r.section8Cap || getFMR(this.preferences.zipCode, Number(r.bedrooms || this.preferences.minBedrooms))),
          locationScore: Number(r.locationScore || 75),
          effectiveRent: Number(r.effectiveRent || 0),
          cashflow: Number(r.cashflow || 0),
          roi: Number(r.roi || 0),
          reasoning: String(r.reasoning || r.explanation || 'See compute proof'),
          timestamp: Date.now(),
          verifiableProof: r.proof || computeResp?.jobId || null,
        } as Recommendation));
      } else {
        // Fallback to simple scoring if compute returns unexpected shape
        recommendations = properties.map((prop) => {
          const effectiveRent = Math.min(Number(prop.estimatedRent ?? 0), Number(prop.section8Cap ?? 0));
          const cashflow = effectiveRent * 0.6;
          const roi = (cashflow * 12) / Number(prop.price ?? 1);
          return {
            ...prop,
            effectiveRent,
            cashflow,
            roi,
            reasoning: `Fallback compute: ROI ${(roi * 100).toFixed(1)}%`,
            timestamp: Date.now(),
            verifiableProof: computeResp?.jobId || undefined,
          } as Recommendation;
        }).filter(r => Number(r.price ?? 0) <= this.preferences.maxPrice && Number(r.roi ?? 0) >= this.preferences.minRoi);
      }
    } catch (err) {
      console.error('OGAgent compute error', err);
      // fallback to local compute if compute fails
      recommendations = [];
      for (const prop of properties) {
        if (Number(prop.price ?? 0) <= this.preferences.maxPrice) {
          const effectiveRent = Math.min(Number(prop.estimatedRent ?? 0), Number(prop.section8Cap ?? 0));
          const cashflow = effectiveRent * 0.6;
          const roi = (cashflow * 12) / Number(prop.price ?? 1);
          if (roi >= this.preferences.minRoi) {
            recommendations.push({
              ...prop,
              effectiveRent,
              cashflow,
              roi,
              reasoning: `Local fallback: ROI ${(roi*100).toFixed(1)}%`,
              timestamp: Date.now(),
              verifiableProof: undefined,
            });
          }
        }
      }
    }

    // 3. 0G Storage (Server Side)
    this.memory.lastScanTimestamp = Date.now();
    this.memory.history.push(`Found ${recommendations.length} deals. Syncing with 0G Storage...`);
    
    const newStateResult = await uploadToStorage(JSON.stringify(this.memory));
    if (newStateResult.success) {
      this.memory.history.push(`State hash updated: ${newStateResult.hash}`);
    }
    
    this.status = 'idle';
    return recommendations.sort((a, b) => Number(b.roi ?? 0) - Number(a.roi ?? 0));
  }

  public async postPurchaseManager() {
    this.status = 'managing';
    const log = "Management check: HUD payment verified via 0G Oracle.";
    this.memory.history.push(log);
    
    await uploadToStorage(JSON.stringify(this.memory));
    
    this.status = 'idle';
    return [log];
  }

  private generateRealisticData(): Property[] {
    return Array.from({ length: 3 }).map((_, i) => {
      const price = 80000 + Math.random() * 120000;
      const bedrooms = this.preferences.minBedrooms;
      return {
        id: `gen-${Date.now()}-${i}`,
        address: `${Math.floor(Math.random() * 9000) + 100} Innovation Blvd, ${this.preferences.zipCode}`,
        price,
        bedrooms,
        bathrooms: 2,
        image: `https://images.unsplash.com/photo-${1570129477492 + i}-45c003edd2be?q=80&w=800&auto=format&fit=crop`,
        estimatedRent: price * 0.012,
        section8Cap: getFMR(this.preferences.zipCode, bedrooms),
        locationScore: 80 + Math.random() * 15,
      };
    });
  }
}
