import { NextRequest, NextResponse } from 'next/server';
import { zgStorage } from '@/og-integration/storage';

export async function POST(req: NextRequest) {
  try {
    const { encrypted } = await req.json();
    if (!encrypted) return NextResponse.json({ success: false, error: 'Missing encrypted metadata' }, { status: 400 });
    // Upload encrypted metadata to 0G Storage
    const hash = await zgStorage.uploadData(encrypted);
    return NextResponse.json({ success: true, hash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
