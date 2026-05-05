import { NextResponse } from 'next/server';
import { uploadToStorage } from '@/app/actions/og';
import { getAgentRecord, upsertAgentRecord } from '@/lib/agentStore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const owner = typeof body.owner === 'string' ? body.owner.trim().toLowerCase() : '';
    const preferences = body.preferences || {};

    if (!owner) return NextResponse.json({ success: false, error: 'owner required' }, { status: 400 });

    const existing = getAgentRecord(owner);

    const providedMemoryRoot = typeof body.memoryRoot === 'string' && body.memoryRoot.trim() ? body.memoryRoot.trim() : null;
    let memoryRoot = providedMemoryRoot;

    if (!memoryRoot) {
      const initialMemory = {
        agentId: existing?.agentId || `agent-${owner}`,
        owner,
        preferences,
        history: [`I activated for ${owner}`],
        createdAt: existing?.createdAt || Date.now(),
      };

      const storageRes = await uploadToStorage(JSON.stringify(initialMemory));
      if (!storageRes.success) return NextResponse.json({ success: false, error: storageRes.error }, { status: 500 });
      memoryRoot = storageRes.hash || null;
    }

    const record = upsertAgentRecord(owner, {
      owner,
      agentId: existing?.agentId || `agent-${owner}`,
      preferences,
      memoryRoot,
      createdAt: existing?.createdAt || Date.now(),
    });

    return NextResponse.json({ success: true, agentId: record.agentId, owner, memoryRoot, agent: record });
  } catch (error) {
    console.error('agents/create error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
