import { NextResponse } from 'next/server';
import { uploadToStorage } from '@/app/actions/og';
import { upsertAgentRecord } from '@/lib/agentStore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, memory } = body;
    if (!owner || !memory) return NextResponse.json({ success: false, error: 'Missing params' });
    const normalizedOwner = String(owner).trim().toLowerCase();

    const nextMemory = {
      ...memory,
      owner: normalizedOwner,
      history: [...(memory?.history || []), `Management sync completed at ${new Date().toISOString()}`],
      lastManagedAt: Date.now(),
    };

    const res = await uploadToStorage(JSON.stringify(nextMemory));
    if (!res.success) return NextResponse.json({ success: false, error: res.error });

    upsertAgentRecord(normalizedOwner, {
      owner: normalizedOwner,
      agentId: memory?.agentId || `agent-${normalizedOwner}`,
      preferences: memory?.preferences || {},
      memoryRoot: res.hash,
    });

    return NextResponse.json({ success: true, memory: nextMemory, memoryRoot: res.hash });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
