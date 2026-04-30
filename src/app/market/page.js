"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchRealProperties, getFMR } from "@/lib/realDataService";
import { Bed, Bath, MapPin, BarChart3, Search, Activity } from "lucide-react";
export default function MarketPage() {
    const [searchTerm, setSearchTerm] = useState("48201"); // Default to Detroit
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const loadProperties = async () => {
        setIsLoading(true);
        // Fetch real data for the search term
        const data = await fetchRealProperties(searchTerm, 3);
        console.log('RentCast raw count:', data === null || data === void 0 ? void 0 : data.length);
        console.log('RentCast sample item:', data === null || data === void 0 ? void 0 : data[0]);
        if (data && data.length > 0) {
            setProperties(data.map((p) => {
                const bedrooms = p.bedrooms || p.bedroomCount || p.beds || 3;
                const bathrooms = p.bathrooms || p.bathroomCount || p.baths || 1;
                const image = (p.media && p.media.length && p.media[0].url)
                    || (p.photos && p.photos.length && p.photos[0].url)
                    || (p.images && p.images.length && p.images[0].url)
                    || p.image
                    || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800&auto=format&fit=crop";
                const address = p.formattedAddress || [p.addressLine, p.city, p.state, p.zip].filter(Boolean).join(', ') || p.address || p.title || 'Unknown Address';
                const estimatedRent = p.rentEstimate || p.estimatedRent || p.rent || 1400;
                const price = p.price || p.listPrice || p.priceEstimate || 120000;
                return {
                    id: p.id || p.listingId || `${Date.now()}-${Math.random()}`,
                    address,
                    price,
                    bedrooms,
                    bathrooms,
                    image,
                    estimatedRent,
                    section8Cap: getFMR(searchTerm, bedrooms),
                    locationScore: 75 + Math.random() * 20,
                };
            }));
        }
        else {
            // No real data available — clear properties and surface a message in UI
            setProperties([]);
        }
        setIsLoading(false);
    };
    useEffect(() => {
        loadProperties();
    }, []);
    return (_jsxs("div", { className: "flex flex-col gap-12 animate-fade-in", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:items-end justify-between gap-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h1", { className: "text-4xl font-outfit font-black tracking-tight", children: "Live Real Estate Market" }), _jsxs("p", { className: "text-muted", children: ["Analyzing real-time listings on 0G Network. Searching ZIP: ", _jsx("span", { className: "text-primary font-bold", children: searchTerm })] })] }), _jsxs("div", { className: "flex gap-4 w-full md:w-auto", children: [_jsxs("div", { className: "relative flex-1 md:w-64", children: [_jsx(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 text-muted", size: 18 }), _jsx("input", { type: "text", placeholder: "Enter ZIP Code...", className: "w-full bg-secondary border border-border rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary outline-hidden transition-all", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), onKeyDown: (e) => e.key === 'Enter' && loadProperties() })] }), _jsx("button", { onClick: loadProperties, disabled: isLoading, className: "btn-primary px-8 flex items-center gap-2", children: isLoading ? _jsx(Activity, { className: "animate-spin", size: 20 }) : "Search Market" })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8", children: properties.map((property) => (_jsxs("div", { className: "glass-card overflow-hidden group hover:border-primary/50 transition-all duration-500 hover:translate-y-[-8px]", children: [_jsxs("div", { className: "relative h-64 w-full overflow-hidden", children: [_jsx("img", { src: property.image, alt: property.address, className: "object-cover group-hover:scale-110 transition-transform duration-700 w-full h-full" }), _jsxs("div", { className: "absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-4 py-2 rounded-full border border-white/20 shadow-xl", children: ["0G SCORE: ", property.locationScore.toFixed(0), "/100"] }), _jsx("div", { className: "absolute bottom-4 left-4 flex gap-2", children: _jsx("div", { className: "bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20", children: "LIVE LISTING" }) })] }), _jsxs("div", { className: "p-8 flex flex-col gap-6", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h3", { className: "font-outfit font-bold text-xl leading-tight line-clamp-1", children: property.address }), _jsxs("p", { className: "text-muted text-sm flex items-center gap-1 font-medium", children: [_jsx(MapPin, { size: 14, className: "text-primary" }), searchTerm, ", United States"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-6 py-6 border-y border-border/30", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-widest text-muted font-black", children: "List Price" }), _jsxs("span", { className: "font-outfit font-black text-2xl text-foreground", children: ["$", property.price.toLocaleString()] })] }), _jsxs("div", { className: "flex flex-col gap-1 text-right", children: [_jsx("span", { className: "text-[10px] uppercase tracking-widest text-muted font-black", children: "Est. Rent" }), _jsxs("span", { className: "font-outfit font-black text-2xl text-primary", children: ["$", property.estimatedRent.toLocaleString()] })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-5 text-sm font-bold text-muted", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Bed, { size: 18, className: "text-primary" }), " ", property.bedrooms] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Bath, { size: 18, className: "text-primary" }), " ", property.bathrooms] })] }), _jsxs("div", { className: "flex items-center gap-2 text-green-400 font-black text-[10px] bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20 shadow-sm", children: [_jsx(BarChart3, { size: 14 }), "SEC 8 CAP: $", property.section8Cap] })] }), _jsx("button", { onClick: () => handleView(property), className: "w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-xs tracking-widest uppercase text-foreground", children: "View Full Analysis" })] })] }, property.id))) })] }));
}
async function handleView(property) {
    var _a;
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property })
        });
        const json = await res.json();
        console.log('analysis result', json);
        alert(`Analysis result: found ${((_a = json.recommendations) === null || _a === void 0 ? void 0 : _a.length) || 0} recommendations (see console).`);
    }
    catch (e) {
        console.error('analysis error', e);
        alert('Failed to get analysis — see console.');
    }
}
