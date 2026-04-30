import { NextResponse } from 'next/server';
import { uploadToStorage, registerAgentIdentity } from '@/app/actions/og';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const owner = body.owner;
    const preferences = body.preferences || {};

    if (!owner) return NextResponse.json({ success: false, error: 'owner required' }, { status: 400 });

    // Prepare initial memory
    const initialMemory = {
      agentId: 'pending',
      preferences,
      history: [`Agent requested by ${owner}`],
      createdAt: Date.now(),
    };

    // Upload memory to 0G Storage
    const storageRes = await uploadToStorage(JSON.stringify(initialMemory));
    if (!storageRes.success) return NextResponse.json({ success: false, error: storageRes.error }, { status: 500 });

    // If client already minted (client sent tokenId + txHash), use that
    const clientTokenId = body.tokenId;
    const clientTxHash = body.txHash;
    let tokenId = clientTokenId;

    // If no client mint, perform server-side registration
    if (!tokenId) {
      if (!storageRes.hash) return NextResponse.json({ success: false, error: 'storage hash missing' }, { status: 500 });
      const identityRes = await registerAgentIdentity(owner, storageRes.hash);
      if (!identityRes.success) return NextResponse.json({ success: false, error: identityRes.error }, { status: 500 });
      tokenId = identityRes.tokenId;
    }

    // Persist mapping in a simple JSON file for demo purposes
    try {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
      const storeFile = path.join(dataDir, 'agents.json');
      let store: any = {};
      if (fs.existsSync(storeFile)) store = JSON.parse(fs.readFileSync(storeFile, 'utf8')) || {};
      store[tokenId] = { owner, preferences, tokenId, memoryRoot: storageRes.hash, createdAt: Date.now(), txHash: clientTxHash || null };
      fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
    } catch (e) {
      console.warn('Failed to persist agent mapping locally', e);
    }

    const txHash = clientTxHash || null;
    return NextResponse.json({ success: true, tokenId, txHash, memoryRoot: storageRes.hash });
  } catch (error: any) {
    console.error('agents/create error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
