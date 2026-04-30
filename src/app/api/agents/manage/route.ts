import { NextResponse } from 'next/server';
import { uploadToStorage } from '@/app/actions/og';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tokenId, owner, memory } = body;
    if (!tokenId || !owner || !memory) return NextResponse.json({ success: false, error: 'Missing params' });

    const res = await uploadToStorage(JSON.stringify(memory));
    if (!res.success) return NextResponse.json({ success: false, error: res.error });

    return NextResponse.json({ success: true, memory, memoryRoot: res.hash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) });
  }
}
