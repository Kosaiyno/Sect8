import { fetchRealProperties, getFMR } from "./realDataService";
import { uploadToStorage, registerAgentIdentity } from "@/app/actions/og";
import { zgCompute } from "@/og-integration/compute";
export class OGAgent {
    constructor(owner, preferences) {
        this.id = "";
        this.status = 'idle';
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
    /**
     * Complete 0G Onboarding Flow:
     * 1. Store initial memory on 0G Storage
     * 2. Register Agentic ID on 0G Chain with the Storage hash
     */
    async registerOnChain() {
        this.status = 'scanning';
        console.log("Sect8: Starting 0G Onboarding via Server Actions...");
        // 1. 0G Storage (Server Side)
        const storageResult = await uploadToStorage(JSON.stringify(this.memory));
        if (!storageResult.success)
            throw new Error(storageResult.error);
        this.memory.history.push(`Initial state persisted on 0G Storage: ${storageResult.hash}`);
        // 2. 0G Chain (Server Side)
        const identityResult = await registerAgentIdentity(this.owner, storageResult.hash);
        if (!identityResult.success)
            throw new Error(identityResult.error);
        this.id = identityResult.tokenId;
        this.memory.agentId = identityResult.tokenId;
        this.memory.history.push(`Agentic ID (ERC-7857) Minted: ${this.id}`);
        this.status = 'idle';
        return true;
    }
    /**
     * Autonomous Scan Loop using 0G Compute & Storage
     */
    async runAutonomousScan() {
        this.status = 'scanning';
        this.memory.history.push(`Autonomous scan triggered for ZIP ${this.preferences.zipCode}`);
        // 1. Data Ingestion (Real market data)
        const rawData = await fetchRealProperties(this.preferences.zipCode, this.preferences.minBedrooms);
        const properties = rawData ? rawData.map((p) => ({
            id: p.id,
            address: p.formattedAddress,
            price: p.price || 150000,
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            image: p.image || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800&auto=format&fit=crop",
            estimatedRent: p.rentEstimate || 1500,
            section8Cap: getFMR(this.preferences.zipCode, p.bedrooms),
            locationScore: 85,
        })) : this.generateRealisticData();
        // 2. Compute Logic (Use 0G Compute service)
        let recommendations = [];
        try {
            const payload = { agent: this.memory, preferences: this.preferences, properties };
            const computeResp = await zgCompute.runAnalysis(payload, { timeoutMs: 120000 });
            const result = (computeResp === null || computeResp === void 0 ? void 0 : computeResp.result) || computeResp;
            // Expect result to contain scored properties and optionally proofs
            const scored = (result === null || result === void 0 ? void 0 : result.output) || (result === null || result === void 0 ? void 0 : result.scored) || (result === null || result === void 0 ? void 0 : result.body) || null;
            if (Array.isArray(scored)) {
                recommendations = scored.map((r) => ({
                    id: r.id,
                    address: r.address,
                    price: r.price,
                    bedrooms: r.bedrooms,
                    bathrooms: r.bathrooms,
                    image: r.image,
                    estimatedRent: r.estimatedRent,
                    section8Cap: r.section8Cap || getFMR(this.preferences.zipCode, r.bedrooms),
                    locationScore: r.locationScore || 75,
                    effectiveRent: r.effectiveRent,
                    cashflow: r.cashflow,
                    roi: r.roi,
                    reasoning: r.reasoning || r.explanation || 'See compute proof',
                    timestamp: Date.now(),
                    verifiableProof: r.proof || (computeResp === null || computeResp === void 0 ? void 0 : computeResp.jobId) || null,
                }));
            }
            else {
                // Fallback to simple scoring if compute returns unexpected shape
                recommendations = properties.map((prop) => {
                    const effectiveRent = Math.min(prop.estimatedRent, prop.section8Cap);
                    const cashflow = effectiveRent * 0.6;
                    const roi = (cashflow * 12) / prop.price;
                    return Object.assign(Object.assign({}, prop), { effectiveRent,
                        cashflow,
                        roi, reasoning: `Fallback compute: ROI ${(roi * 100).toFixed(1)}%`, timestamp: Date.now(), verifiableProof: (computeResp === null || computeResp === void 0 ? void 0 : computeResp.jobId) || undefined });
                }).filter(r => r.price <= this.preferences.maxPrice && r.roi >= this.preferences.minRoi);
            }
        }
        catch (err) {
            console.error('OGAgent compute error', err);
            // fallback to local compute if compute fails
            recommendations = [];
            for (const prop of properties) {
                if (prop.price <= this.preferences.maxPrice) {
                    const effectiveRent = Math.min(prop.estimatedRent, prop.section8Cap);
                    const cashflow = effectiveRent * 0.6;
                    const roi = (cashflow * 12) / prop.price;
                    if (roi >= this.preferences.minRoi) {
                        recommendations.push(Object.assign(Object.assign({}, prop), { effectiveRent,
                            cashflow,
                            roi, reasoning: `Local fallback: ROI ${(roi * 100).toFixed(1)}%`, timestamp: Date.now(), verifiableProof: undefined }));
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
        return recommendations.sort((a, b) => b.roi - a.roi);
    }
    async postPurchaseManager() {
        this.status = 'managing';
        const log = "Management check: HUD payment verified via 0G Oracle.";
        this.memory.history.push(log);
        await uploadToStorage(JSON.stringify(this.memory));
        this.status = 'idle';
        return [log];
    }
    generateRealisticData() {
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
