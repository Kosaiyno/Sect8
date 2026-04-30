import { fetchRealProperties, getFMR } from "./realDataService.js";
import { uploadAgentMemory } from "../og-integration/storage.js";
export class Section8Agent {
    constructor(agentId) {
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
    analyzeProperty(property) {
        const effectiveRent = Math.min(property.estimatedRent, property.section8Cap);
        // Simple expense calculation (mortgage, insurance, taxes, maintenance ~ 40% of rent)
        const monthlyExpenses = effectiveRent * 0.4;
        const monthlyCashflow = effectiveRent - monthlyExpenses;
        const annualCashflow = monthlyCashflow * 12;
        // ROI = Annual Cashflow / Purchase Price
        const roi = annualCashflow / property.price;
        let reasoning = "";
        if (roi > 0.15) {
            reasoning = "High yield opportunity with strong cashflow potential.";
        }
        else if (property.section8Cap > property.estimatedRent) {
            reasoning = "Section 8 cap exceeds market rent, providing a stable income buffer.";
        }
        else if (property.locationScore > 80) {
            reasoning = "Excellent location with high demand and appreciation potential.";
        }
        else {
            reasoning = "Solid investment with stable returns.";
        }
        return Object.assign(Object.assign({}, property), { effectiveRent, cashflow: monthlyCashflow, roi,
            reasoning, timestamp: Date.now(), verifiableProof: `0g-proof-${Math.random().toString(36).substring(7)}` });
    }
    // Simulate the autonomous loop
    async runScan() {
        var _a;
        console.log(`Agent ${this.agentId} starting scan...`);
        // Data fetching via RentCast (0G ingestion)
        let properties = [];
        for (const loc of this.memory.preferences.preferredLocations) {
            try {
                const res = await fetchRealProperties(loc, 3);
                if (res && Array.isArray(res) && res.length) {
                    const mapped = res.map((p) => {
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
                        };
                    });
                    properties = properties.concat(mapped);
                }
            }
            catch (e) {
                console.warn(`Agent ${this.agentId}: failed to fetch properties for ${loc}`, e);
            }
        }
        const recommendations = properties
            .map((p) => this.analyzeProperty(p))
            .filter((r) => r.roi >= this.memory.preferences.minRoi)
            .sort((a, b) => b.roi - a.roi);
        // Update memory (Simulate 0G Storage)
        this.memory.lastScanTimestamp = Date.now();
        this.memory.history.push(`Scan completed: found ${recommendations.length} deals.`);
        // Save updated memory to 0G storage
        try {
            const cid = await uploadAgentMemory(this.memory);
            const rootHash = cid?.rootHash || cid;
            console.log(`Agent memory saved to 0G storage. CID: ${rootHash}`);
            this.memory.lastStorageCid = rootHash;
        }
        catch (e) {
            console.warn('Failed to save agent memory to 0G storage:', e);
        }
        console.log(`Scan complete. Top deal: ${(_a = recommendations[0]) === null || _a === void 0 ? void 0 : _a.address}`);
        return recommendations;
    }
    getMemory() {
        return this.memory;
    }
    async uploadMemory() {
        await uploadAgentMemory(this.memory);
    }
}
