import { NextRequest } from 'next/server';
import { OGAgent } from '@/lib/ogAgent';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const property = body.property || {};

    const zipMatch = (property.address || '').match(/(\d{5})/);
    const zipCode = zipMatch ? zipMatch[0] : (property.zip || '00000');
    const minBedrooms = property.bedrooms || 1;
    const maxPrice = property.price || 200000;

    const agent = new OGAgent('server', { zipCode, minBedrooms, maxPrice, minRoi: 0.05 });
    const recommendations = await agent.runScan();

    return new Response(JSON.stringify({ success: true, recommendations }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('analyze route error', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
