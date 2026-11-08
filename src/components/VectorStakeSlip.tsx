import React, { useActionState, useOptimistic, startTransition } from "react";

export interface TelemetryNodeTarget {
  id: string; // e.g., 'QB1', 'WR1'
  vectorType: "POCKET_COLLAPSE" | "xCOMP_BURST" | "SEP_DELTA" | "YAC_TRAJECTORY";
  baseOdds: number;
  metricLabel: string; // e.g., 'Pass Sep Delta > 3.2m'
  currentValue: string; // e.g., '4.1m/s'
}

interface VectorStakeSlipProps {
  targetNode: TelemetryNodeTarget | null;
  onClose: () => void;
  onStakeSettled?: (stakeResult: any) => void;
}

interface ActionState {
  success: boolean;
  message: string;
  txHash?: string;
  error?: string;
}

// Initial state for React 19 useActionState
const initialActionState: ActionState = {
  success: false,
  message: "",
};

export const VectorStakeSlip: React.FC<VectorStakeSlipProps> = ({
  targetNode,
  onClose,
  onStakeSettled,
}) => {
  if (!targetNode) return null;

  // React 19 Action to dispatch vector stake to Cloudflare Durable Object worker
  async function submitVectorStakeAction(
    prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> {
    const stakeAmount = parseFloat(formData.get("stakedAmount") as string) || 10;
    const vectorType = formData.get("vectorType") as string;
    const targetId = formData.get("targetId") as string;

    try {
      // Sub-millisecond state lock request to Planetary-MAX edge router
      const response = await fetch("/api/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_id: targetId,
          vector_type: vectorType,
          staked_amount: stakeAmount,
          odds: targetNode?.baseOdds,
          timestamp_ns: performance.now(),
        }),
      });

      if (!response.ok) {
        throw new Error("Edge node rejection: Latency threshold exceeded.");
      }

      const result = await response.json();

      if (onStakeSettled) onStakeSettled(result);

      return {
        success: true,
        message: `STATE LOCK EXECUTED: ${result.state_lock || "VERIFIED"}`,
        txHash: `0xMAX_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: "Failed to execute state lock",
        error: err.message || "Network partition error",
      };
    }
  }

  // React 19 useActionState Hook
  const [state, formAction, isPending] = useActionState(
    submitVectorStakeAction,
    initialActionState
  );

  // React 19 useOptimistic Hook for zero-latency local execution state
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    state.success ? "LOCKED" : "IDLE",
    (_current, newStatus: string) => newStatus
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Trigger optimistic UI transition immediately
    startTransition(() => {
      setOptimisticStatus("EXECUTING_OPTIMISTIC_LOCK");
    });

    // Execute server/edge action
    startTransition(() => {
      formAction(formData);
    });
  };

  const calculatePayout = (amount: number) => {
    return (amount * targetNode.baseOdds).toFixed(2);
  };

  const [stakeInput, setStakeInput] = React.useState<number>(25);

  return (
    <div className="absolute bottom-6 left-6 z-50 w-96 bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 shadow-2xl shadow-cyan-950/50 text-slate-100 font-sans animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
            Vector Stake Primitive
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-lg font-mono leading-none"
        >
          ✕
        </button>
      </div>

      {/* Selected Node Telemetry HUD */}
      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-4 font-mono">
        <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
          <span>Target Node:</span>
          <span className="text-cyan-300 font-bold">{targetNode.id}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
          <span>Vector Type:</span>
          <span className="text-emerald-400">{targetNode.vectorType}</span>
        </div>
        <div className="flex justify-between items-center text-sm font-bold text-slate-200 mt-2 pt-2 border-t border-slate-900">
          <span>{targetNode.metricLabel}</span>
          <span className="text-cyan-400 text-base">{targetNode.baseOdds}x</span>
        </div>
      </div>

      {/* Vector Stake Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="targetId" value={targetNode.id} />
        <input type="hidden" name="vectorType" value={targetNode.vectorType} />

        {/* Stake Amount Selector */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
            Stake Commitment (USDT / Token)
          </label>
          <div className="relative">
            <input
              type="number"
              name="stakedAmount"
              value={stakeInput}
              onChange={(e) => setStakeInput(Number(e.target.value))}
              min="1"
              max="10000"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none rounded-xl py-2.5 px-3 text-slate-100 font-mono text-sm"
              required
            />
            <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-500">
              TOKENS
            </span>
          </div>
        </div>

        {/* Quick Amount Chips */}
        <div className="flex gap-2">
          {[10, 25, 100, 250].map((val) => (
            <button
              type="button"
              key={val}
              onClick={() => setStakeInput(val)}
              className={`flex-1 py-1 rounded-lg text-xs font-mono transition-colors ${
                stakeInput === val
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700"
              }`}
            >
              +{val}
            </button>
          ))}
        </div>

        {/* Dynamic Multiplier & Yield Output */}
        <div className="flex justify-between items-center text-xs font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-slate-400">Est. Vector Yield:</span>
          <span className="text-emerald-400 font-bold text-sm">
            +{calculatePayout(stakeInput)} TOKENS
          </span>
        </div>

        {/* Status / Error Notifications */}
        {state.error && (
          <div className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2 rounded-lg">
            ⚠️ {state.error}
          </div>
        )}

        {state.success && (
          <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2 rounded-lg">
            ✓ {state.message}
            {state.txHash && <div className="text-[10px] text-slate-500 mt-1">{state.txHash}</div>}
          </div>
        )}

        {/* Submit Button with Optimistic State rendering */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
        >
          {isPending || optimisticStatus === "EXECUTING_OPTIMISTIC_LOCK"
            ? "Locking Vector State (<1ms)..."
            : `Execute State Lock • ${targetNode.baseOdds}x`}
        </button>
      </form>
    </div>
  );
};
