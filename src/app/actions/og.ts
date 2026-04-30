"use server";

import { ethers } from "ethers";
import { zgStorage } from "@/og-integration/storage";

/**
 * Server Action for 0G Storage
 * Uploads via the 0G SDK and returns the canonical dataRoot/hash
 */
export async function uploadToStorage(data: string) {
  console.log("Server Action: Uploading to 0G Storage...");
  try {
    const dataRoot = await zgStorage.uploadData(data);
    return { success: true, hash: dataRoot };
  } catch (error: any) {
    console.error("0G Storage Error:", error);
    // Provide richer error details when available (axios)
    let detail = String(error?.message || error);
    try {
      if (error?.response) {
        detail += ' | status=' + error.response.status;
        if (error.response.data) detail += ' | data=' + JSON.stringify(error.response.data);
      }
    } catch (e) {}
    return { success: false, error: detail };
  }
}

/**
 * Server Action for Agentic ID
 * This will call the deployed `Sect8AgentManager` contract's `initializeAgent`
 * function and return the minted tokenId and txHash.
 */
export async function registerAgentIdentity(owner: string, storageHash: string) {
  console.log("Server Action: Registering Agentic ID on-chain...");
  try {
    const providerUrl = process.env.OG_RPC_URL || process.env.NEXT_PUBLIC_0G_RPC_URL;
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const deployerKey = process.env.AGENT_DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerKey) throw new Error('Missing AGENT_DEPLOYER_PRIVATE_KEY in env');

    const wallet = new ethers.Wallet(deployerKey, provider);
    try {
      const bal = await provider.getBalance(wallet.address);
      const network = await provider.getNetwork();
      console.log('Server mint: providerUrl, wallet.address, network, balance', { providerUrl, address: wallet.address, chainId: network?.chainId, balance: ethers.formatEther(bal) });
    } catch (logErr) {
      console.warn('Server mint: failed to fetch wallet/network/balance', logErr);
    }

    const managerAddress = process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS || process.env.AGENT_MANAGER_ADDRESS;
    if (!managerAddress) throw new Error('Missing agent manager contract address in env');

    const abi = [
      'function initializeAgent(address owner, string memory initialMemoryRoot) public returns (uint256)',
      'event AgentInitialized(uint256 indexed tokenId, address indexed owner, string memoryRoot)'
    ];

    const contract = new ethers.Contract(managerAddress, abi, wallet);
    const tx = await contract.initializeAgent(owner, storageHash);
    const receipt = await tx.wait();

    // try to parse AgentInitialized event to get tokenId
    const event = receipt?.logs?.map((l: any) => {
      try { return contract.interface.parseLog(l); } catch(e) { return null; }
    }).find((e: any) => e && e.name === 'AgentInitialized');

    let tokenId: any = null;
    if (event && event.args && event.args[0]) {
      tokenId = event.args[0].toString ? event.args[0].toString() : String(event.args[0]);
    }

    return { success: true, tokenId, txHash: receipt.transactionHash };
  } catch (error: any) {
    console.error('registerAgentIdentity error', error);
    return { success: false, error: String(error) };
  }
}
