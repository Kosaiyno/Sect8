// Usage: node scripts/mintINFTAgent.js <userAddress> <agentMetadataURI>
import 'dotenv/config';
import { ethers } from 'ethers';
import iNFTAbi from '../src/abis/iNFT.json' assert { type: 'json' };

const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL);
const signer = new ethers.Wallet(process.env.AGENT_DEPLOYER_PRIVATE_KEY, provider);
const iNFT = new ethers.Contract(process.env.AGENT_NFT_ADDRESS, iNFTAbi, signer);

async function getOrMintINFT(userAddress, agentMetadataURI) {
  // Mint new iNFT for user
  const tx = await iNFT.mint(userAddress, agentMetadataURI);
  const receipt = await tx.wait();
  const transferEvent = receipt.events.find(e => e.event === 'Transfer');
  const tokenId = transferEvent ? transferEvent.args.tokenId : null;
  if (!tokenId) throw new Error('Mint failed: No tokenId found in events');
  return tokenId.toString();
}

async function main() {
  const userAddress = process.argv[2];
  const agentMetadataURI = process.argv[3] || '';
  if (!userAddress) throw new Error('Usage: node scripts/mintINFTAgent.js <userAddress> <agentMetadataURI>');
  const tokenId = await getOrMintINFT(userAddress, agentMetadataURI);
  console.log(`Minted iNFT agent for user ${userAddress}. Token ID: ${tokenId}`);
}

main().catch(e => { console.error(e); process.exit(1); });
