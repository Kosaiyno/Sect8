export async function ensure0GChain() {
    try {
        const ethereum = window.ethereum;
        if (!ethereum)
            return { success: false, error: 'No wallet provider' };
        const chainId = '0x4115'; // 16661
        try {
            await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
            return { success: true };
        }
        catch (switchError) {
            // 4902 = chain not added
            if (switchError && switchError.code === 4902) {
                try {
                    await ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                                chainId,
                                chainName: '0G Mainnet',
                                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                                rpcUrls: [process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc.0g.ai'],
                                blockExplorerUrls: ['https://explorer.0g.ai']
                            }]
                    });
                    // try switch again
                    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
                    return { success: true };
                }
                catch (addError) {
                    return { success: false, error: String((addError === null || addError === void 0 ? void 0 : addError.message) || addError) };
                }
            }
            return { success: false, error: String((switchError === null || switchError === void 0 ? void 0 : switchError.message) || switchError) };
        }
    }
    catch (e) {
        return { success: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) };
    }
}
