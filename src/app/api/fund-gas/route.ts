import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { normalizeServerPrivateKey } from '@/lib/serverKey';

// Use the deployer agent's private key from env
const pk = process.env.SERVER_OPERATOR_PRIVATE_KEY;
const rpc = 'https://evmrpc.0g.ai';
const FUND_AMOUNT = ethers.parseEther('0.01'); // Amount of native token to send (adjust as needed)

export async function POST(req: Request) {
  try {
    console.log('[fund-gas] API called');
    const body = await req.json();
    const address = body?.address;
    console.log('[fund-gas] Requested address:', address);
    if (!address || !ethers.isAddress(address)) {
      console.error('[fund-gas] Invalid address:', address);
      return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
    }
    if (!pk || !rpc) {
      console.error('[fund-gas] Missing pk or rpc:', { pk: !!pk, rpc: !!rpc });
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(normalizeServerPrivateKey(pk, 'SERVER_OPERATOR_PRIVATE_KEY'), provider);

    try {
      console.log('[fund-gas] Preparing to send', FUND_AMOUNT.toString(), 'to', address);
      const tx = await wallet.sendTransaction({ to: address, value: FUND_AMOUNT });
      console.log('[fund-gas] Sent tx:', tx.hash, 'to', address, 'amount', FUND_AMOUNT.toString());
      return NextResponse.json({ success: true, txHash: tx.hash });
    } catch (txError) {
      console.error('[fund-gas] Transaction error:', txError);
      return NextResponse.json({ success: false, error: String(txError) }, { status: 500 });
    }
  } catch (error) {
    console.error('[fund-gas] Handler error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
