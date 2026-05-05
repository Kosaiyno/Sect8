// This API route is deprecated. Minting is now handled on the frontend via the user's wallet.
export async function POST() {
  return new Response('Minting must be done from the frontend using your wallet.', { status: 410 });
}
