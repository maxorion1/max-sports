import type { NodeTelemetry, PlayPrediction } from "../utils/predictiveEngine";

interface Props {
  selectedNode: NodeTelemetry | null;
  prediction: PlayPrediction | null;
}

export function PredictiveSuitePanel({ selectedNode, prediction }: Props) {
  if (!selectedNode || !prediction) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center font-mono text-xs text-slate-500" aria-live="polite">
        Select a telemetry node in the 3D viewport to view a live estimate.
      </section>
    );
  }

  const completionPct = Math.min(100, Math.max(0, prediction.completionProbability * 100));

  return (
    <section className="space-y-5 rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md" aria-labelledby="predictive-suite-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" aria-hidden="true" />
          <h2 id="predictive-suite-heading" className="text-sm font-black tracking-wider text-cyan-300">PREDICTIVE TELEMETRY</h2>
        </div>
        <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-400">LIVE ESTIMATE</span>
      </div>

      <div className="flex items-center justify-between gap-3 font-mono text-xs">
        <span className="text-slate-400">TARGET NODE</span>
        <span className="font-bold text-white">{selectedNode.name} ({selectedNode.id})</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between gap-3 font-mono text-xs">
          <span className="text-slate-400">ESTIMATED COMPLETION</span>
          <span className="font-bold text-emerald-400">{completionPct.toFixed(1)}%</span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950 p-0.5"
          role="progressbar"
          aria-label="Estimated completion probability"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Number(completionPct.toFixed(1))}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-[width] duration-200" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 text-center font-mono">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs text-slate-500">PROJECTED YARDS</div>
          <div className="mt-1 text-xl font-black text-cyan-400">+{prediction.projectedYardsGained} YDS</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs text-slate-500">INDICATIVE MULTIPLIER</div>
          <div className="mt-1 text-xl font-black text-indigo-400">{prediction.recommendedStakeMultiplier}×</div>
        </div>
      </div>
      <p className="text-[11px] leading-4 text-slate-500">Illustrative heuristic from current telemetry only—not a validated forecast or wagering advice.</p>
    </section>
  );
}
