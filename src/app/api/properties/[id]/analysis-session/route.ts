import { NextResponse } from 'next/server';
import { advancePropertyDetailsSession, createPropertyDetailsSession, getPropertyDetailsSession, runPropertyDetailsSessionToCompletion } from '@/lib/propertyDetailsSession';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialSession = createPropertyDetailsSession(id);

  if (!initialSession) {
    return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
  }

  const session = await runPropertyDetailsSessionToCompletion(initialSession.id);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Property analysis session failed to initialize.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, session }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'sessionId is required.' }, { status: 400 });
  }

  const existing = getPropertyDetailsSession(sessionId);
  const normalizedId = decodeURIComponent(decodeURIComponent(id));
  if (!existing || existing.listingId !== normalizedId) {
    return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
  }

  const session = await advancePropertyDetailsSession(sessionId);
  return NextResponse.json({ success: true, session }, { headers: { 'Cache-Control': 'no-store' } });
}