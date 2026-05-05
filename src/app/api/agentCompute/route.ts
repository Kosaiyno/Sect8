import { NextRequest, NextResponse } from 'next/server';
import { zgCompute } from '@/og-integration/compute';
import { uploadAgentMemory } from '@/og-integration/storage';
import { getAgentRecordCookieName, readCookieValue } from '@/lib/0gPersistence';
import { upsertAgentRecord } from '@/lib/agentStore';

export async function POST(req: NextRequest) {
  try {
    const { prompt, memory, owner, recordRoot } = await req.json();
    const res = await zgCompute.callCompute('deepseek', {
      messages: [
        { role: 'system', content: 'You are Sect8, a helpful real-estate AI agent. Speak in first person as the agent.' },
        { role: 'user', content: prompt }
      ]
    });
    const reply = res?.result?.choices?.[0]?.message?.content || '...';
    let memoryRoot: string | null = null;
    let storageError: string | null = null;
    let nextRecordRoot: string | null = null;

    if (memory) {
      try {
        const normalizedOwner = typeof owner === 'string' ? owner.trim().toLowerCase() : '';
        const cookieName = normalizedOwner ? getAgentRecordCookieName(normalizedOwner) : null;
        const currentRoot = normalizedOwner
          ? (typeof recordRoot === 'string' && recordRoot.trim()
            ? recordRoot.trim()
            : readCookieValue(req.headers.get('cookie'), cookieName || ''))
          : null;
        const nextMemory = {
          ...memory,
          owner: normalizedOwner || memory?.owner || null,
          lastConversationAt: Date.now(),
          history: [...(memory?.history || []), reply],
        };
        memoryRoot = await uploadAgentMemory(nextMemory);
        if (memoryRoot && normalizedOwner) {
          const updated = await upsertAgentRecord(normalizedOwner, {
            owner: normalizedOwner,
            agentId: nextMemory?.agentId || `agent-${normalizedOwner}`,
            preferences: nextMemory?.preferences || {},
            memoryRoot,
          }, currentRoot);
          nextRecordRoot = updated.root;
        }
      } catch (storageFailure) {
        storageError = String(storageFailure);
        console.error('[agentCompute] Storage error:', storageFailure);
      }
    }

    const response = NextResponse.json({ success: true, reply, memoryRoot, recordRoot: nextRecordRoot, storageError });
    if (owner && nextRecordRoot) {
      response.cookies.set(getAgentRecordCookieName(String(owner).trim().toLowerCase()), nextRecordRoot, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
    }
    return response;
  } catch (error) {
    console.error('[agentCompute] Compute error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
