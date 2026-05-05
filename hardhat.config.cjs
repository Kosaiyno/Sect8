const { config } = require('dotenv');
config();

require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    '0g-testnet': {
      url: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc-testnet.0g.ai',
      accounts: process.env.AGENT_DEPLOYER_PRIVATE_KEY ? [process.env.AGENT_DEPLOYER_PRIVATE_KEY] : [],
    },
    '0g-mainnet': {
      url: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai',
      accounts: process.env.AGENT_DEPLOYER_PRIVATE_KEY ? [process.env.AGENT_DEPLOYER_PRIVATE_KEY] : [],
      chainId: 16661,
    },
    og: {
      url: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai',
      accounts: process.env.AGENT_DEPLOYER_PRIVATE_KEY ? [process.env.AGENT_DEPLOYER_PRIVATE_KEY] : [],
      chainId: 16661,
    },
    mainnet: {
      url: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai',
      accounts: process.env.AGENT_DEPLOYER_PRIVATE_KEY ? [process.env.AGENT_DEPLOYER_PRIVATE_KEY] : [],
      chainId: 16661,
    },
  },
};
