import { NextResponse } from 'next/server';
import { advancePropertyDetailsSession, createPropertyDetailsSession, getPropertyDetailsSession } from '@/lib/propertyDetailsSession';
import { getAgentRecordCookieName, read0gJson, readCookieValue, type ListingsSnapshot } from '@/lib/0gPersistence';
import { getAgentRecord, upsertAgentRecord } from '@/lib/agentStore';

export const dynamic = 'force-dynamic';

async function syncAgentListingsRoot(request: Request, listingsRoot?: string | null) {
  const normalizedListingsRoot = typeof listingsRoot === 'string' ? listingsRoot.trim() : '';
  if (!normalizedListingsRoot) {
    return null;
  }

  const snapshot = await read0gJson<ListingsSnapshot>(normalizedListingsRoot);
  const owner = typeof snapshot?.owner === 'string' ? snapshot.owner.trim().toLowerCase() : '';
  if (!owner) {
    return null;
  }

  const cookieName = getAgentRecordCookieName(owner);
  const currentRoot = readCookieValue(request.headers.get('cookie'), cookieName);
  if (!currentRoot) {
    return null;
  }

  const existing = await getAgentRecord(owner, currentRoot);
  if (!existing || existing.latestListingsRoot === normalizedListingsRoot) {
    return {
      owner,
      root: existing?.recordRoot || currentRoot,
    };
  }

  const updated = await upsertAgentRecord(owner, {
    latestListingsRoot: normalizedListingsRoot,
    latestListingsZip: snapshot?.zipCode || existing.latestListingsZip || null,
    latestListingsBedrooms: Number(snapshot?.bedrooms || existing.latestListingsBedrooms || 0) || existing.latestListingsBedrooms || null,
    latestListingsFetchedAt: Number(snapshot?.fetchedAt || existing.latestListingsFetchedAt || 0) || existing.latestListingsFetchedAt || null,
  }, currentRoot);

  return {
    owner,
    root: updated.root,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const listingsRoot = typeof body.listingsRoot === 'string' ? body.listingsRoot : null;
  const initialSession = await createPropertyDetailsSession(id, listingsRoot);

  if (!initialSession) {
    return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
  }

  const syncResult = await syncAgentListingsRoot(request, initialSession.listingsRoot || null);
  const response = NextResponse.json({ success: true, session: initialSession }, { headers: { 'Cache-Control': 'no-store' } });
  if (syncResult) {
    response.cookies.set(getAgentRecordCookieName(syncResult.owner), syncResult.root, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return response;
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
  const syncResult = session ? await syncAgentListingsRoot(request, session.listingsRoot || null) : null;
  const response = NextResponse.json({ success: true, session }, { headers: { 'Cache-Control': 'no-store' } });
  if (syncResult) {
    response.cookies.set(getAgentRecordCookieName(syncResult.owner), syncResult.root, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return response;
}