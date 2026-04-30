#!/usr/bin/env node
/* Simple worker: calls autoscan and runs decision+actions on found listings. */
import fs from 'fs';
import path from 'path';
import { decideForListing } from '../src/lib/agentDecision.js';
import { executeAction } from '../src/lib/agentActions.js';

const API_BASE = process.env.DEV_API_BASE || 'http://localhost:3000';
const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS || 1000 * 60 * 5); // 5m default

async function runCycle() {
  try {
    console.log('Worker: calling autoscan...');
    const res = await fetch(`${API_BASE}/api/agents/autoscan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const json = await res.json().catch(() => ({}));
    console.log('autoscan result', json?.summary || 'no-summary');

    // invoke server engine to run decisions and actions
    console.log('Worker: invoking engine...');
    const engineRes = await fetch(`${API_BASE}/api/agents/engine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const engineJson = await engineRes.json().catch(() => ({}));
    console.log('engine result', engineJson.processed?.length || 0);
  } catch (e:any) {
    console.error('Worker error', e?.message || e);
  }
}

// Run immediately and then interval
runCycle();
setInterval(runCycle, INTERVAL_MS);
