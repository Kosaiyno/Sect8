// Usage: node scripts/fetchAgentMemory.js <cid>
import 'dotenv/config';

const cid = process.argv[2];
if (!cid) throw new Error('Usage: node scripts/fetchAgentMemory.js <cid>');

try {
  const { downloadAgentMemory } = await import('../src/og-integration/storage.js');
  const memory = await downloadAgentMemory(cid);
  console.log('--- Agent Memory from 0G Storage ---');
  console.log(JSON.stringify(memory, null, 2));
} catch (e) {
  console.error('Error fetching agent memory:', e);
  process.exit(1);
}
