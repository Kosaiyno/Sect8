
import { ethers } from 'ethers';
import iNFTAbi from '../abis/iNFT.json' assert { type: 'json' };

export async function getOrMintINFT(userAddress: string, agentMetadataURI: string): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(process.env.OG_RPC_URL);
  const signer = new ethers.Wallet(process.env.AGENT_DEPLOYER_PRIVATE_KEY, provider);
  const iNFT = new ethers.Contract(
    process.env.AGENT_NFT_ADDRESS || process.env.AGENT_MANAGER_ADDRESS || process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS,
    iNFTAbi,
    signer
  );
  const tx = await iNFT.initializeAgent(userAddress, agentMetadataURI);
  const receipt = await tx.wait();
  let tokenId = null;
  if (receipt && receipt.logs) {
    for (const log of receipt.logs) {
      try {
        const parsed = iNFT.interface.parseLog(log);
        if (parsed && parsed.name === 'AgentInitialized') {
          tokenId = parsed.args.tokenId || parsed.args[0];
          break;
        }
      } catch {}
    }
  }
  if (!tokenId && receipt && receipt.logs && receipt.logs[0]) {
    tokenId = receipt.logs[0].topics[1];
  }
  if (!tokenId) throw new Error('Mint failed: No tokenId found in events');
  return tokenId.toString();
}
