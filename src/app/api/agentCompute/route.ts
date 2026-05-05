import { NextRequest, NextResponse } from 'next/server';
import { zgCompute } from '@/og-integration/compute';
import { uploadAgentMemory } from '@/og-integration/storage';
import { upsertAgentRecord } from '@/lib/agentStore';

export async function POST(req: NextRequest) {
  try {
    const { prompt, memory, owner } = await req.json();
    const res = await zgCompute.callCompute('deepseek', {
      messages: [
        { role: 'system', content: 'You are Sect8, a helpful real-estate AI agent. Speak in first person as the agent.' },
        { role: 'user', content: prompt }
      ]
    });
    const reply = res?.result?.choices?.[0]?.message?.content || '...';
    let memoryRoot: string | null = null;
    let storageError: string | null = null;

    if (memory) {
      try {
        const normalizedOwner = typeof owner === 'string' ? owner.trim().toLowerCase() : '';
        const nextMemory = {
          ...memory,
          owner: normalizedOwner || memory?.owner || null,
          lastConversationAt: Date.now(),
          history: [...(memory?.history || []), reply],
        };
        memoryRoot = await uploadAgentMemory(nextMemory);
        if (memoryRoot && normalizedOwner) {
          upsertAgentRecord(normalizedOwner, {
            owner: normalizedOwner,
            agentId: nextMemory?.agentId || `agent-${normalizedOwner}`,
            preferences: nextMemory?.preferences || {},
            memoryRoot,
          });
        }
      } catch (storageFailure) {
        storageError = String(storageFailure);
        console.error('[agentCompute] Storage error:', storageFailure);
      }
    }

    return NextResponse.json({ success: true, reply, memoryRoot, storageError });
  } catch (error) {
    console.error('[agentCompute] Compute error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
