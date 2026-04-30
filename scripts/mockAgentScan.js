
// Usage: node scripts/mockAgentScan.js
// This script instantiates the agent, runs a scan with mock data, and prints the resulting 0G storage CID.

import 'dotenv/config';


import { Section8Agent } from '../src/lib/agent.js';



// Top-level await is allowed in ES modules
try {
  // Use a fixed agentId for repeatability
  const agent = new Section8Agent('mock-agent');
  // Inject mock preferences if needed
  agent.memory.preferences = {
    preferredLocations: ['12345'],
    minRoi: 0,
    zipCode: '12345',
    minBedrooms: 1,
    minBathrooms: 1,
  };
  // Optionally inject mock properties if agent supports it
  if (typeof agent.setMockProperties === 'function') {
    // Simple mock property array
    const mockProperties = [
      {
        id: 'mock1',
        price: 100000,
        estimatedRent: 1500,
        section8Cap: 1600,
        locationScore: 85,
      },
      {
        id: 'mock2',
        price: 120000,
        estimatedRent: 1700,
        section8Cap: 1750,
        locationScore: 78,
      }
    ];
    agent.setMockProperties(mockProperties);
  }
  // Run scan (should trigger uploadAgentMemory internally)
  await agent.runScan();
  // The CID should be printed by the agent class
  console.log('Scan complete. Check above for 0G storage CID.');
} catch (e) {
  console.error('Error running mock agent scan:', e);
  process.exit(1);
}
