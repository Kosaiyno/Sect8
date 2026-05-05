import { NextResponse } from 'next/server';
import { advancePropertyDetailsSession, createPropertyDetailsSession, getPropertyDetailsSession, runPropertyDetailsSessionToCompletion } from '@/lib/propertyDetailsSession';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const listingsRoot = typeof body.listingsRoot === 'string' ? body.listingsRoot : null;
  const initialSession = await createPropertyDetailsSession(id, listingsRoot);

  if (!initialSession) {
    return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
  }

  const session = await runPropertyDetailsSessionToCompletion(initialSession.id, initialSession.sessionRoot);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Property analysis session failed to initialize.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, session }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const sessionRoot = searchParams.get('sessionRoot');

  if (!sessionId || !sessionRoot) {
    return NextResponse.json({ success: false, error: 'sessionId and sessionRoot are required.' }, { status: 400 });
  }

  const existing = await getPropertyDetailsSession(sessionId, sessionRoot);
  const normalizedId = decodeURIComponent(decodeURIComponent(id));
  if (!existing || existing.listingId !== normalizedId) {
    return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
  }

  const session = await advancePropertyDetailsSession(sessionId, sessionRoot);
  return NextResponse.json({ success: true, session }, { headers: { 'Cache-Control': 'no-store' } });
}