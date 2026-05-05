import { NextResponse } from 'next/server';
import { uploadToStorage } from '@/app/actions/og';
import { getAgentRecordCookieName, readCookieValue } from '@/lib/0gPersistence';
import { upsertAgentRecord } from '@/lib/agentStore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, memory } = body;
    if (!owner || !memory) return NextResponse.json({ success: false, error: 'Missing params' });
    const normalizedOwner = String(owner).trim().toLowerCase();
    const cookieName = getAgentRecordCookieName(normalizedOwner);
    const currentRoot = typeof body.recordRoot === 'string' && body.recordRoot.trim()
      ? body.recordRoot.trim()
      : readCookieValue(req.headers.get('cookie'), cookieName);

    const nextMemory = {
      ...memory,
      owner: normalizedOwner,
      history: [...(memory?.history || []), `Management sync completed at ${new Date().toISOString()}`],
      lastManagedAt: Date.now(),
    };

    const res = await uploadToStorage(JSON.stringify(nextMemory));
    if (!res.success) return NextResponse.json({ success: false, error: res.error });

    const { root } = await upsertAgentRecord(normalizedOwner, {
      owner: normalizedOwner,
      agentId: memory?.agentId || `agent-${normalizedOwner}`,
      preferences: memory?.preferences || {},
      memoryRoot: res.hash,
    }, currentRoot);

    const response = NextResponse.json({ success: true, memory: nextMemory, memoryRoot: res.hash, recordRoot: root });
    response.cookies.set(cookieName, root, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
