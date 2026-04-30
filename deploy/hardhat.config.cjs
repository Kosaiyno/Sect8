require('@nomicfoundation/hardhat-ethers');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    og: {
      url: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai',
      accounts: process.env.AGENT_DEPLOYER_PRIVATE_KEY ? [process.env.AGENT_DEPLOYER_PRIVATE_KEY] : [],
      chainId: 16661,
    },
  },
};
