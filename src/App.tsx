import React, { useState } from "react";
import { ArcadeViewport } from "./components/ArcadeViewport";
import { VectorStakeSlip, TelemetryNodeTarget } from "./components/VectorStakeSlip";

export default function App() {
  const [selectedNode, setSelectedNode] = useState<TelemetryNodeTarget | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(4250.00);

  // Mock telemetry node dictionary for interactive selection from the 3D viewport
  const nodeRegistry: Record<string, TelemetryNodeTarget> = {
    "QB1": {
      id: "QB1",
      vectorType: "POCKET_COLLAPSE",
      baseOdds: 2.85,
      metricLabel: "Pocket Collapse Rate > 85%",
      currentValue: "0.92 (Critical)",
    },
    "WR1": {
      id: "WR1",
      vectorType: "SEP_DELTA",
      baseOdds: 1.95,
      metricLabel: "Receiver Separation Delta > 3.2m",
      currentValue: "3.8m/s",
    },
    "DE1": {
      id: "DE1",
      vectorType: "xCOMP_BURST",
      baseOdds: 3.40,
      metricLabel: "Pass Rush Acceleration Burst",
      currentValue: "9.1 m/s²",
    },
  };

  const handleNodeSelect = (playerId: string) => {
    const target = nodeRegistry[playerId] || {
      id: playerId,
      vectorType: "YAC_TRAJECTORY",
      baseOdds: 2.10,
      metricLabel: "Yards After Catch > 5.5m",
      currentValue: "6.2m",
    };
    setSelectedNode(target);
  };

  const handleStakeSettled = (result: any) => {
    // Deduct or update balance on successful edge state lock
    if (result.state_lock) {
      setWalletBalance((prev) => Math.max(0, prev - 25));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Sovereign Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl px-6 py-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50 animate-pulse" />
          <h1 className="text-sm font-mono tracking-widest uppercase font-bold text-slate-100">
            MAX-SPORTS <span className="text-cyan-400">// KERNEL v1.0</span>
          </h1>
        </div>

        {/* User Account & Economic Telemetry */}
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500">KERNEL:</span>
            <span className="text-emerald-400">PLANETARY-MAX</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500">TIER:</span>
            <span className="text-cyan-300 font-bold">QUANT_PRO</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500">BALANCE:</span>
            <span className="text-emerald-400 font-bold">{walletBalance.toFixed(2)} TOKENS</span>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 relative flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Section Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Spatial Arcade Viewport & Vector Staking
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Select any live telemetry node on the 3D grid to open the sub-millisecond Durable Object state lock slip.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNodeSelect("QB1")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-cyan-400 transition-colors"
            >
              Target QB1
            </button>
            <button
              onClick={() => handleNodeSelect("WR1")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-cyan-400 transition-colors"
            >
              Target WR1
            </button>
          </div>
        </div>

        {/* 3D Three.js Arcade Viewport Container */}
        <div className="relative flex-1 min-h-[600px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <ArcadeViewport onNodeSelect={handleNodeSelect} />

          {/* Vector Stake Slip Overlay (Conditionally rendered on node selection) */}
          {selectedNode && (
            <VectorStakeSlip
              targetNode={selectedNode}
              onClose={() => setSelectedNode(null)}
              onStakeSettled={handleStakeSettled}
            />
          )}
        </div>

      </main>

      {/* Sovereign Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center font-mono text-[10px] text-slate-600 uppercase tracking-widest">
        MAX-ECOSYSTEM • Sovereign Edge Execution • Zero-Entropy Telemetry Pipeline
      </footer>

    </div>
  );
}
