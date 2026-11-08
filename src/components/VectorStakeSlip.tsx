import { useState } from "react";
import { executeVectorStake } from "../services/executeVectorStake";

export interface TelemetryNodeTarget {
  id: string;
  vectorType: "POCKET_COLLAPSE" | "xCOMP_BURST" | "SEP_DELTA" | "YAC_TRAJECTORY";
  baseOdds: number;
  metricLabel: string;
  currentValue: string;
}

interface VectorStakeSlipProps {
  targetNode: TelemetryNodeTarget | null;
  onClose: () => void;
  onStakeSettled?: (stakeResult: { success: boolean; transactionHash: string; newBalance: number }) => void;
  matchId?: string;
  walletAddress?: string;
}

export function VectorStakeSlip({
  targetNode,
  onClose,
  onStakeSettled,
  matchId = "match_max_01",
  walletAddress,
}: VectorStakeSlipProps) {
  const [stakeAmount, setStakeAmount] = useState(25);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!targetNode) return null;

  const handleExecuteLock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setStatus("COMMITTING TO EDGE...");
    setIsSubmitting(true);

    try {
      const result = await executeVectorStake({
        nodeId: targetNode.id,
        stakeAmount,
        walletAddress,
        matchId,
      });

      setStatus(`STATE LOCK EXECUTED: VERIFIED (${result.transactionHash})`);
      onStakeSettled?.(result);
    } catch (err) {
      setStatus("LOCK FAILED: EDGE REQUEST ERROR");
      setError(err instanceof Error ? err.message : "Unable to complete the stake request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="absolute bottom-4 left-4 z-50 w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-5 text-slate-100 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl" aria-labelledby="stake-slip-title">
      <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 id="stake-slip-title" className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">Vector stake</h2>
        <button type="button" onClick={onClose} aria-label="Close stake slip" className="text-slate-400 hover:text-white">✕</button>
      </div>

      <dl className="mb-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs">
        <div className="flex justify-between gap-3"><dt className="text-slate-400">Target node</dt><dd className="font-bold text-cyan-300">{targetNode.id}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-400">Vector type</dt><dd className="text-emerald-400">{targetNode.vectorType}</dd></div>
        <div className="flex justify-between gap-3 border-t border-slate-800 pt-2"><dt className="text-slate-300">{targetNode.metricLabel}</dt><dd className="font-bold text-cyan-400">{targetNode.baseOdds}×</dd></div>
      </dl>

      <form onSubmit={handleExecuteLock} className="space-y-4">
        <label htmlFor="stake-amount" className="block text-xs font-mono uppercase tracking-wider text-slate-400">Stake amount (tokens)</label>
        <input
          id="stake-amount"
          name="stakeAmount"
          type="number"
          value={stakeAmount}
          onChange={(event) => setStakeAmount(Number(event.target.value))}
          min="1"
          max="10000"
          step="1"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-cyan-400"
        />
        <div className="flex gap-2">
          {[10, 25, 100, 250].map((amount) => (
            <button key={amount} type="button" onClick={() => setStakeAmount(amount)} className={`flex-1 rounded-lg border py-1 text-xs font-mono ${stakeAmount === amount ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"}`}>
              {amount}
            </button>
          ))}
        </div>
        {status && <p role="status" className="break-words text-xs font-mono text-cyan-300">{status}</p>}
        {error && <p role="alert" className="text-xs font-mono text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !Number.isFinite(stakeAmount) || stakeAmount <= 0}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 font-mono text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Committing to edge…" : `Execute stake · ${targetNode.baseOdds}×`}
        </button>
        <p className="text-[11px] leading-4 text-slate-500">This submits a stake request to the configured service. Only continue if you intend to submit this transaction.</p>
      </form>
    </section>
  );
}
