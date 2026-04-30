import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
const ogChain = {
    id: 16661,
    name: '0G Mainnet',
    network: '0g',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai'] } },
    blockExplorers: { default: { name: '0G Explorer', url: 'https://explorer.0g.ai' } },
    testnet: false,
};
export const config = getDefaultConfig({
    appName: 'Sect8 AI Agent',
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [ogChain, mainnet, polygon, optimism, arbitrum, base, sepolia],
    ssr: true,
});
