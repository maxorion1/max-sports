import { useState } from "react";

type UpgradeTier = "SPORTS_PLUS" | "SPORTS_PRO" | "ELITE" | "ENTERPRISE";
interface TierUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTier?: (tier: UpgradeTier) => void;
}

const plans: { tier: UpgradeTier; price: string; description: string }[] = [
  { tier: "SPORTS_PLUS", price: "$9.99 / month", description: "Expanded sports insights and additional simulation capacity." },
  { tier: "SPORTS_PRO", price: "$29.99 / month", description: "Unlimited MAX SIM and eligible live-stream access." },
  { tier: "ELITE", price: "$99 / month", description: "Premium simulation tools and eligible live-stream access." },
  { tier: "ENTERPRISE", price: "Contact us", description: "Organization access and account support." },
];

export function TierUpgradeModal({ open, onClose, onSelectTier }: TierUpgradeModalProps) {
  const [selected, setSelected] = useState<UpgradeTier | null>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="tier-upgrade-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400">Membership</p><h2 id="tier-upgrade-title" className="mt-1 text-2xl font-black">Choose a Sports Pass</h2></div>
          <button type="button" onClick={onClose} aria-label="Close upgrade dialog" className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => <button key={plan.tier} type="button" aria-pressed={selected === plan.tier} onClick={() => setSelected(plan.tier)} className={`rounded-xl border p-4 text-left transition ${selected === plan.tier ? "border-cyan-400 bg-cyan-500/10" : "border-slate-800 bg-slate-900 hover:border-slate-600"}`}>
            <span className="flex items-center justify-between gap-2 font-mono text-sm font-bold text-cyan-300"><span>{plan.tier.replace("_", " ")}</span><span className="text-xs text-white">{plan.price}</span></span><span className="mt-2 block text-xs leading-5 text-slate-400">{plan.description}</span>
          </button>)}
        </div>
        <p className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">Choosing a plan does not charge or activate a subscription. Connect this action to a payment provider and verified entitlement workflow.</p>
        <footer className="mt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900">Cancel</button><button type="button" disabled={!selected} onClick={() => { if (selected) onSelectTier?.(selected); }} className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Continue to checkout</button></footer>
      </section>
    </div>
  );
}
