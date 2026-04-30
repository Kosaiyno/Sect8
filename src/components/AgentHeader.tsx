"use client";
import React from 'react';

export default function AgentHeader({
  agent,
  lastScan,
  onChangeZip,
  onRunScan,
  scanFrequency,
  setScanFrequency,
  autoMode,
  setAutoMode
}: any) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="agent-wrapper">
          <div className="agent-avatar">S8</div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-outfit font-black">{`Sect8 Agent #${agent.id || '1'}`}</h2>
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${agent.status === 'scanning' ? 'bg-yellow-600 text-black' : agent.status === 'active' ? 'bg-green-600 text-white' : 'bg-white/5 text-muted'}`}>{agent.status || 'idle'}</span>
            </div>
            <div className="mt-2">
              <div className="agent-bubble">
                <div className="font-bold">Hi — I'm your investing agent.</div>
                <div className="muted mt-1">Scanning ZIP {agent.preferences?.zipCode || '—'} for {agent.preferences?.bedrooms || 'any'}-bd homes. Last scan: {lastScan ? new Date(lastScan).toLocaleString() : 'never'}</div>
                <span className="agent-typing" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input defaultValue={agent.preferences?.zipCode} onBlur={(e) => onChangeZip && onChangeZip(e.target.value)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm" />
        <select value={scanFrequency} onChange={(e) => setScanFrequency(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-sm">
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
        </select>
        <button onClick={() => setAutoMode(!autoMode)} className={`px-4 py-2 rounded-xl font-bold ${autoMode ? 'bg-green-600 text-white' : 'bg-white/5'}`}>{autoMode ? 'Autonomous On' : 'Autonomous Off'}</button>
        <button onClick={onRunScan} className="btn-primary">Run Scan</button>
      </div>
    </div>
  );
}
