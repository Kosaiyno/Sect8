You are a senior full-stack + AI + Web3 engineer building a hackathon-winning MVP.

Your goal is to build a production-ready AI Agent application that clearly demonstrates:
- Persistent agent identity (Agent ID)
- Autonomous behavior (not just user-triggered)
- Memory (stored and reused)
- Verifiable actions (on-chain + storage)
- Deep integration with 0G stack

This project must feel like a real AI agent, not a dashboard.

🧱 PRODUCT DEFINITION
Build:
A persistent AI agent that continuously scans and analyzes Section 8 real estate deals and produces verifiable, on-chain recommendations.
The agent must:
- exist independently of user sessions
- store memory over time
- act periodically (autonomous loop)
- log its actions transparently

⚙️ REQUIRED 0G INTEGRATION
1. 0G Storage (Memory Layer)
Store user preferences, scanned property dataset, agent decisions, reasoning logs.

2. 0G Compute (Reasoning Layer)
Use for deal scoring, ROI calculation, cashflow calculation, risk classification.

3. 0G Chain (Execution + Proof)
Deploy a contract that logs agent decisions, timestamps, agent ID, selected property.

4. Agent ID (Identity Layer)
Each user must have a persistent agentId linked to wallet/session.

🌐 DATA INGESTION & SCANNING LAYER
Simulate Zillow, Realtor.com, RentCast, HUD data. Create a realistic mock dataset.

🏠 PROPERTY DATA STRUCTURE
id, address, price, bedrooms, bathrooms, image, estimatedRent, section8Cap, locationScore

🖼️ IMAGE HANDLING
Use Unsplash/Picsum placeholders if real images are unavailable.

🧠 SECTION 8-SPECIFIC ANALYSIS
Effective Rent = min(estimatedRent, section8Cap)
Cashflow = Effective Rent - expenses

🔁 AUTONOMOUS AGENT LOOP
1. Fetch new properties
2. Enrich data
3. Run analysis via 0G Compute
4. Store results via 0G Storage
5. Rank top deals
6. Log decisions via 0G Chain
7. Update agent memory

🖥️ FRONTEND STRUCTURE (Next.js + Tailwind)
1. Homepage: Create Agent, Connect Wallet
2. Agent Dashboard: Agent Name, ID, Run Scan, View Recommendations. Tabs for Memory, Recommendations, On-chain Logs.
3. Market Page: raw property list, filters.

🧠 AGENT EXPLANATIONS
Each recommendation must include reasoning (e.g. "positive cashflow, strong demand area").
