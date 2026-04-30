import { NextRequest, NextResponse } from 'next/server';
import { getOrMintINFT } from '@/lib/mintINFT';

export async function POST(req: NextRequest) {
  const { userAddress, agentMetadataURI } = await req.json();
  if (!userAddress) return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });

  try {
    const tokenId = await getOrMintINFT(userAddress, agentMetadataURI || '');
    return NextResponse.json({ tokenId, agentMetadataURI });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
