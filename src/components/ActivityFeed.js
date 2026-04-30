"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ActivityFeed({ agent }) {
    var _a;
    const history = ((_a = agent.memory) === null || _a === void 0 ? void 0 : _a.history) || [];
    const items = history.slice(-20).reverse();
    return (_jsxs("div", { className: "glass-card p-6", children: [_jsx("h4", { className: "font-bold", children: "Agent Activity Feed" }), _jsx("div", { className: "mt-4 space-y-3", children: items.length ? items.map((it, i) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-primary mt-2" }), _jsxs("div", { children: [_jsx("div", { className: "text-sm", children: String(it) }), _jsx("div", { className: "text-xs text-muted", children: new Date().toLocaleString() })] })] }, i))) : _jsx("div", { className: "text-muted", children: "No activity yet" }) })] }));
}
