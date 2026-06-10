import 'dotenv/config';

import { wrapFetchWithPayment, x402Client, x402HTTPClient } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const endpoint = process.env.X402_TARGET_URL || 'https://sect8.xyz/api/x402/section8-analysis';
const privateKey = process.env.X402_BUYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('Set X402_BUYER_PRIVATE_KEY or EVM_PRIVATE_KEY in .env before running this script.');
}

const account = privateKeyToAccount(privateKey);
const client = new x402Client();
registerExactEvmScheme(client, { signer: account, networks: ['eip155:8453'] });

const httpClient = new x402HTTPClient(client);
const fetchWithPayment = wrapFetchWithPayment(fetch, httpClient);
const requestBody = process.env.X402_REQUEST_JSON
  ? JSON.parse(process.env.X402_REQUEST_JSON)
  : {
      address: process.env.X402_ADDRESS || '8773 Petoskey Ave, Detroit, MI 48204',
      zipCode: process.env.X402_ZIP_CODE || '48204',
      purchasePrice: Number(process.env.X402_PURCHASE_PRICE || 85000),
      bedrooms: Number(process.env.X402_BEDROOMS || 3),
      bathrooms: Number(process.env.X402_BATHROOMS || 1),
    };

console.log(`Paying Sect8 x402 endpoint from buyer ${account.address}`);
console.log(`Endpoint: ${endpoint}`);
console.log('Request body:');
console.dir(requestBody, { depth: 4 });

const response = await fetchWithPayment(endpoint, {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
  },
  body: JSON.stringify(requestBody),
});

const contentType = response.headers.get('content-type') || '';
const body = contentType.includes('application/json')
  ? await response.json()
  : await response.text();

console.log(`HTTP ${response.status}`);
console.log('Response body:');
console.dir(body, { depth: 6 });

try {
  const settlement = httpClient.getPaymentSettleResponse((name) => response.headers.get(name) || undefined);
  console.log('Payment settlement:');
  console.dir(settlement, { depth: 6 });
} catch (error) {
  console.log(`No PAYMENT-RESPONSE settlement header found: ${error.message}`);
}
