export const sect8AgentManagerAbi = [
  {
    type: 'function',
    name: 'initializeAgent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'initialMemoryRoot', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'AgentInitialized',
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'memoryRoot', type: 'string' },
    ],
    anonymous: false,
  },
] as const;