
import { Property, Recommendation, AgentMemory } from "@/types";
import { fetchRealProperties, getFMR } from "./realDataService";
import { uploadAgentMemory } from "@/og-integration/storage";


export class Section8Agent {
  private agentId: string;
  private memory: AgentMemory;


  constructor(agentId: string) {
    this.agentId = agentId;
    this.memory = {
      agentId,
      lastScanTimestamp: 0,
      preferences: {
        minRoi: 0.1, // 10%
        preferredLocations: ["Detroit", "Cleveland", "Baltimore"],
      },
      history: [],
    };
  }

  // Simulate 0G Compute: Analyzing a property
  public analyzeProperty(property: Property): Recommendation {
    const estimatedRent = Number(property.estimatedRent ?? 0);
    const section8Cap = Number(property.section8Cap ?? estimatedRent);
    const locationScore = Number(property.locationScore ?? 0);
    const purchasePrice = Number(property.price ?? property.purchasePrice ?? 1);
    const effectiveRent = Math.min(estimatedRent, section8Cap);
    
    // Simple expense calculation (mortgage, insurance, taxes, maintenance ~ 40% of rent)
    const monthlyExpenses = effectiveRent * 0.4;
    const monthlyCashflow = effectiveRent - monthlyExpenses;
    const annualCashflow = monthlyCashflow * 12;
    
    // ROI = Annual Cashflow / Purchase Price
    const roi = annualCashflow / purchasePrice;
    
    let reasoning = "";
    if (roi > 0.15) {
      reasoning = "High yield opportunity with strong cashflow potential.";
    } else if (section8Cap > estimatedRent) {
      reasoning = "Section 8 cap exceeds market rent, providing a stable income buffer.";
    } else if (locationScore > 80) {
      reasoning = "Excellent location with high demand and appreciation potential.";
    } else {
      reasoning = "Solid investment with stable returns.";
    }

    return {
      ...property,
      effectiveRent,
      cashflow: monthlyCashflow,
      roi,
      reasoning,
      timestamp: Date.now(),
      verifiableProof: `0g-proof-${Math.random().toString(36).substring(7)}`,
    };
  }

  // Run a market scan and persist the resulting memory state.
  public async runScan(): Promise<Recommendation[]> {
    console.log(`Agent ${this.agentId} starting scan...`);
    // Data fetching via RentCast (0G ingestion)
    let properties: Property[] = [];
    for (const loc of this.memory.preferences.preferredLocations) {
      try {
        const res = await fetchRealProperties(loc, 3);
        if (res && Array.isArray(res) && res.length) {
          const mapped = res.map((p: any) => {
            const bedrooms = p.bedrooms || p.bedroomCount || p.beds || 3;
            const bathrooms = p.bathrooms || p.bathroomCount || p.baths || 1;
            const image = (p.media && p.media.length && p.media[0].url)
              || (p.photos && p.photos.length && p.photos[0].url)
              || (p.images && p.images.length && p.images[0].url)
              || p.image || '';

            const address = p.formattedAddress || [p.addressLine1 || p.addressLine, p.city, p.state, p.zip].filter(Boolean).join(', ') || p.address || p.title || 'Unknown Address';
            const estimatedRent = p.rentEstimate || p.estimatedRent || p.rent || 1400;
            const price = p.price || p.listPrice || p.priceEstimate || 120000;

            return {
              id: p.id || p.listingId || `${Date.now()}-${Math.random()}`,
              address,
              price,
              bedrooms,
              bathrooms,
              image,
              estimatedRent,
              section8Cap: getFMR(loc, bedrooms),
              locationScore: 70 + Math.random() * 25,
            } as Property;
          });
          properties = properties.concat(mapped);
        }
      } catch (e) {
        console.warn(`Agent ${this.agentId}: failed to fetch properties for ${loc}`, e);
      }
    }

    const recommendations = properties
      .map((p) => this.analyzeProperty(p))
      .filter((r) => Number(r.roi ?? 0) >= this.memory.preferences.minRoi)
      .sort((a, b) => Number(b.roi ?? 0) - Number(a.roi ?? 0));

    // Update memory (Simulate 0G Storage)
    this.memory.lastScanTimestamp = Date.now();
    this.memory.history.push(`Scan completed: found ${recommendations.length} deals.`);
    
    // Save updated memory to 0G storage
    try {
      const cid = await uploadAgentMemory(this.memory);
      console.log(`Agent memory saved to 0G storage. CID: ${cid}`);
      this.memory.lastStorageCid = cid;
    } catch (e) {
      console.warn('Failed to save agent memory to 0G storage:', e);
    }

    console.log(`Scan complete. Top deal: ${recommendations[0]?.address}`);
    
    return recommendations;
  }

  public getMemory(): AgentMemory {
    return this.memory;
  }

  public async uploadMemory(): Promise<void> {
    await uploadAgentMemory(this.memory);
  }
}
