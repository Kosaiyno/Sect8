import 'server-only';

import { facilitator as cdpFacilitator } from '@coinbase/x402';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { type Network, type RouteConfig, x402ResourceServer } from '@x402/next';

const DEFAULT_TESTNET_FACILITATOR = 'https://x402.org/facilitator';
export const X402_SECTION8_ANALYSIS_PATH = '/api/x402/section8-analysis';

function getAppOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL
    || 'sect8.xyz';

  return configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`;
}

function getX402ResourceUrl() {
  const explicitUrl = process.env.X402_RESOURCE_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  return new URL(X402_SECTION8_ANALYSIS_PATH, getAppOrigin()).toString();
}

const analysisInputExample = {
  address: '8773 Petoskey Ave, Detroit, MI 48204',
  zipCode: '48204',
  purchasePrice: 85000,
  bedrooms: 3,
  bathrooms: 1,
};

const analysisOutputExample = {
  success: true,
  service: 'Sect8 Section 8 underwriting analysis',
  listing: {
    address: '8773 Petoskey Ave, Detroit, MI 48204',
    price: 85000,
    beds: 3,
    baths: 1,
  },
  underwriting: {
    monthlyCashflow: 1260,
    capRate: 12.8,
    roi: 12.8,
  },
  analysis: {
    score: 78,
    verdict: 'Good Section 8 candidate.',
    headline: 'Property has verified rent support and attractive cash-flow potential.',
  },
  proof: {
    provider: '0g-compute',
    storageRoot: '0x...',
  },
};

export function getX402Network() {
  return (process.env.X402_NETWORK || 'eip155:84532') as Network;
}

function getPayToAddress() {
  const payTo = process.env.X402_PAY_TO?.trim();
  if (payTo) {
    return payTo;
  }

  throw new Error('Missing X402_PAY_TO. Set it to the wallet that should receive USDC payments.');
}

function getFacilitatorClient() {
  const explicitUrl = process.env.X402_FACILITATOR_URL?.trim();
  const network = getX402Network();

  if (explicitUrl) {
    return new HTTPFacilitatorClient({ url: explicitUrl });
  }

  if (network === 'eip155:84532') {
    return new HTTPFacilitatorClient({ url: DEFAULT_TESTNET_FACILITATOR });
  }

  return new HTTPFacilitatorClient(cdpFacilitator);
}

export const x402Server = new x402ResourceServer(getFacilitatorClient())
  .register(getX402Network(), new ExactEvmScheme());

export const section8AnalysisRouteConfig: RouteConfig = {
  accepts: {
    scheme: 'exact',
    price: process.env.X402_SECTION8_ANALYSIS_PRICE || '$0.05',
    network: getX402Network(),
    payTo: () => getPayToAddress(),
  },
  resource: getX402ResourceUrl(),
  serviceName: 'Sect8',
  description: 'Generate a Section 8 property underwriting memo with rent support, cash flow, ROI, risk context, housing-authority contact details, and 0G Compute/Storage proof metadata.',
  mimeType: 'application/json',
  tags: ['real-estate', 'section-8', 'underwriting', '0g-compute', 'property-analysis'],
  unpaidResponseBody: async () => ({
    contentType: 'application/json',
    body: {
      error: 'payment_required',
      service: 'Sect8 Section 8 underwriting analysis',
      price: process.env.X402_SECTION8_ANALYSIS_PRICE || '$0.05',
      network: getX402Network(),
      input: {
        ...analysisInputExample,
      },
    },
  }),
  extensions: {
    ...declareDiscoveryExtension({
      bodyType: 'json',
      input: analysisInputExample,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: { type: 'string', description: 'Optional existing Sect8 listing ID.' },
          listingsRoot: { type: 'string', description: 'Optional 0G Storage listings root for existing listing lookup.' },
          address: { type: 'string', description: 'Property address when analyzing a direct property input.' },
          zipCode: { type: 'string', description: 'Five-digit property ZIP code.' },
          purchasePrice: { type: 'number', description: 'Purchase/list price in USD.' },
          price: { type: 'number', description: 'Alias for purchasePrice.' },
          bedrooms: { type: 'number', description: 'Bedroom count used for HUD/FMR rent support.' },
          bathrooms: { type: 'number' },
          propertyType: { type: 'string' },
          squareFootage: { type: 'number' },
          estimatedRent: { type: 'number', description: 'Optional override for estimated monthly rent.' },
        },
        anyOf: [
          { required: ['listingId'] },
          { required: ['address', 'purchasePrice'] },
          { required: ['address', 'price'] },
        ],
      },
      output: {
        example: analysisOutputExample,
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            listing: { type: 'object' },
            underwriting: { type: 'object' },
            housingAuthority: { type: ['object', 'null'] },
            ownership: { type: 'object' },
            risk: { type: 'object' },
            analysis: { type: 'object' },
            proof: { type: 'object' },
          },
          required: ['success', 'listing', 'underwriting', 'analysis', 'proof'],
        },
      },
    }),
  },
};
