'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { RainbowKitProvider, darkTheme, } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient, } from "@tanstack/react-query";
import { config } from '@/config/wagmi';
const queryClient = new QueryClient();
export function Providers({ children }) {
    return (_jsx(WagmiProvider, { config: config, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(RainbowKitProvider, { theme: darkTheme(), children: children }) }) }));
}
