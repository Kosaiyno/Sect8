import { decodeEventLog } from 'viem';
import { writeContract, waitForTransactionReceipt } from '@wagmi/core';

import { config, ogChain } from '@/config/wagmi';
import { ensure0GChain } from '@/lib/wallet';
import { sect8AgentManagerAbi } from '@/lib/sect8AgentManagerAbi';

const agentManagerAddress = process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS as `0x${string}` | undefined;

export function getAgentManagerAddress() {
  return agentManagerAddress;
}

export async function initializeAgentOnChain(owner: string, memoryRoot: string) {
  const contractAddress = getAgentManagerAddress();
  if (!contractAddress) {
    throw new Error('Missing NEXT_PUBLIC_AGENT_MANAGER_ADDRESS for on-chain activation.');
  }

  const chainResult = await ensure0GChain();
  if (!chainResult.success) {
    throw new Error(chainResult.error || 'Failed to switch wallet to 0G Mainnet.');
  }

  const hash = await writeContract(config, {
    address: contractAddress,
    abi: sect8AgentManagerAbi,
    functionName: 'initializeAgent',
    args: [owner as `0x${string}`, memoryRoot],
    chain: ogChain as any,
  });

  const receipt = await waitForTransactionReceipt(config, {
    chainId: 16661,
    hash,
    confirmations: 1,
  });

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: sect8AgentManagerAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'AgentInitialized') {
        return {
          tokenId: decoded.args.tokenId.toString(),
          txHash: receipt.transactionHash,
          contractAddress,
        };
      }
    } catch {
      // Ignore unrelated logs in the same transaction.
    }
  }

  throw new Error('initializeAgent transaction succeeded, but AgentInitialized was not found in the receipt logs.');
}