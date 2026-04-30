"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { X, Target, DollarSign, Home, Percent } from "lucide-react";
import { ethers } from 'ethers';
import { ensure0GChain } from '@/lib/wallet';
// Minimal ABI for client mint
const AGENT_NFT_ABI = [
    'function mintAgent(string initialMemoryRoot, string encryptedURI) public returns (uint256)',
    'event AgentInitialized(uint256 indexed tokenId, address indexed owner, string memoryRoot)'
];
export function CreateAgentModal({ onClose, onCreate }) {
    const [prefs, setPrefs] = useState({
        zipCode: "48201", // Default Detroit
        minBedrooms: 3,
        maxPrice: 150000,
        minRoi: 0.1,
    });
    return (_jsx("div", { className: "fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "glass-card w-full max-w-lg p-8 flex flex-col gap-8 animate-fade-in relative", children: [_jsx("button", { onClick: onClose, className: "absolute top-6 right-6 text-muted hover:text-white", children: _jsx(X, { size: 24 }) }), _jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-2xl font-outfit font-black", children: "Configure Your Autonomous Agent" }), _jsx("p", { className: "text-muted text-sm", children: "Define the parameters for your agent's scan on 0G." })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "text-xs font-bold uppercase text-muted flex items-center gap-1", children: [_jsx(Target, { size: 14 }), " Target ZIP Code"] }), _jsx("input", { type: "text", className: "w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden", value: prefs.zipCode, onChange: (e) => setPrefs(Object.assign(Object.assign({}, prefs), { zipCode: e.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "text-xs font-bold uppercase text-muted flex items-center gap-1", children: [_jsx(Home, { size: 14 }), " Min Bedrooms"] }), _jsx("input", { type: "number", className: "w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden", value: prefs.minBedrooms, onChange: (e) => setPrefs(Object.assign(Object.assign({}, prefs), { minBedrooms: parseInt(e.target.value) })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "text-xs font-bold uppercase text-muted flex items-center gap-1", children: [_jsx(DollarSign, { size: 14 }), " Max Budget"] }), _jsx("input", { type: "number", className: "w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden", value: prefs.maxPrice, onChange: (e) => setPrefs(Object.assign(Object.assign({}, prefs), { maxPrice: parseInt(e.target.value) })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "text-xs font-bold uppercase text-muted flex items-center gap-1", children: [_jsx(Percent, { size: 14 }), " Target ROI (%)"] }), _jsx("input", { type: "number", step: "0.01", className: "w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-hidden", value: prefs.minRoi * 100, onChange: (e) => setPrefs(Object.assign(Object.assign({}, prefs), { minRoi: parseFloat(e.target.value) / 100 })) })] })] }), _jsx("button", { onClick: async () => {
                        var _a;
                        // Upload initial memory to server-side storage first
                        try {
                            const initialMemory = {
                                agentId: 'pending',
                                preferences: prefs,
                                history: [`Agent requested via client`],
                                createdAt: Date.now()
                            };
                            const uploadRes = await fetch('/api/agents/uploadMemory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memory: initialMemory }) });
                            const uploadJson = await uploadRes.json();
                            if (!uploadJson.success)
                                throw new Error(uploadJson.error || 'upload failed');
                            const storageHash = uploadJson.hash;
                            // If wallet present, mint via wallet
                            if (window.ethereum) {
                                // ensure wallet is on 0G
                                const switchRes = await ensure0GChain();
                                if (!switchRes.success)
                                    throw new Error('Wallet chain switch failed: ' + (switchRes.error || ''));
                                const provider = new ethers.BrowserProvider(window.ethereum);
                                await provider.send('eth_requestAccounts', []);
                                const signer = await provider.getSigner();
                                try {
                                    const signerAddr = await signer.getAddress();
                                    const network = await provider.getNetwork();
                                    const bal = await provider.getBalance(signerAddr);
                                    console.log('Client mint: provider network, signer, balance', { chainId: network === null || network === void 0 ? void 0 : network.chainId, signer: signerAddr, balance: ethers.formatEther(bal) });
                                }
                                catch (logErr) {
                                    console.warn('Client mint: failed to read signer/network/balance', logErr);
                                }
                                const nftAddress = process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS;
                                if (!nftAddress)
                                    throw new Error('Agent NFT contract address not configured');
                                const contract = new ethers.Contract(nftAddress, AGENT_NFT_ABI, signer);
                                const tx = await contract.mintAgent(storageHash, "");
                                const receipt = await tx.wait();
                                // parse event to get tokenId
                                let tokenId = null;
                                for (const log of receipt.logs || []) {
                                    try {
                                        const parsed = contract.interface.parseLog(log);
                                        if (parsed && parsed.name === 'AgentInitialized') {
                                            tokenId = (_a = parsed.args[0]) === null || _a === void 0 ? void 0 : _a.toString();
                                            break;
                                        }
                                    }
                                    catch (e) { }
                                }
                                // persist mapping server-side
                                await fetch('/api/agents/create', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ owner: await signer.getAddress(), preferences: prefs, tokenId, txHash: receipt.transactionHash })
                                });
                                onCreate(prefs);
                                return;
                            }
                            // fallback: call server create which will mint via server wallet
                            await fetch('/api/agents/create', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ owner: null, preferences: prefs })
                            });
                            onCreate(prefs);
                        }
                        catch (e) {
                            alert('Failed to initialize agent: ' + ((e === null || e === void 0 ? void 0 : e.message) || e));
                        }
                    }, className: "btn-primary w-full py-4 text-lg", children: "Initialize Agent on 0G (Mint with Wallet)" })] }) }));
}
