import { useEffect, useState } from "react";
import { getOrCreateSessionKeyPair, getSovereignPublicKeyHex, signPayload } from "../utils/cryptoSession";

type Tier = "FREE" | "SPORTS_PLUS" | "SPORTS_PRO" | "ELITE" | "ENTERPRISE";

export function SovereignAccountPanel() {
  const [sovereignId, setSovereignId] = useState("INITIALIZING...");
  const [tier, setTier] = useState<Tier>("FREE");
  const [simsRemaining, setSimsRemaining] = useState(3);
  const [keyStatus, setKeyStatus] = useState("SECURE (LOCAL P-256)");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const keys = await getOrCreateSessionKeyPair();
        const publicKeyHex = await getSovereignPublicKeyHex(keys);
        const timestamp = Date.now();
        const signature = await signPayload({ action: "account-status", timestamp }, keys.privateKey);
        const bytes = Uint8Array.from(publicKeyHex.match(/.{2}/g) ?? [], (part) => Number.parseInt(part, 16));
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const id = `0xMAX_${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16)}`;
        if (!cancelled) setSovereignId(id);
        const response = await fetch("/api/account/status", {
          headers: { "X-Public-Key": publicKeyHex, "X-Signature": signature, "X-Timestamp": String(timestamp) },
        });
        const result = await response.json() as { tier?: Tier; simulationsRemaining?: number; error?: string };
        if (!response.ok) throw new Error(result.error || "Account status request failed.");
        if (!cancelled) {
          if (result.tier) setTier(result.tier);
          if (typeof result.simulationsRemaining === "number") setSimsRemaining(result.simulationsRemaining);
        }
      } catch (error) {
        console.error("Failed to load sovereign account state:", error);
        if (!cancelled) setKeyStatus("LOCAL KEY · ACCOUNT OFFLINE");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="max-w-md space-y-5 rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 font-mono text-xs shadow-2xl backdrop-blur-md" aria-labelledby="account-panel-title">
      <header className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 id="account-panel-title" className="text-sm font-black tracking-wider text-cyan-300">SOVEREIGN ACCOUNT HUB</h2>
        <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400">LOCAL KEY</span>
      </header>
      <div className="space-y-3">
        <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-[10px] text-slate-500">ANONYMOUS SOVEREIGN ID</div><div className="truncate font-bold text-cyan-400">{sovereignId}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-[10px] text-slate-500">ACTIVE PASS TIER</div><div className="font-bold text-emerald-400">{tier}</div></div>
          <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-[10px] text-slate-500">SIM QUOTA</div><div className="font-bold text-indigo-400">{loading ? "LOADING" : `${simsRemaining} REMAINING`}</div></div>
        </div>
        <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-[10px] text-slate-500">KEYSTORE</div><div className="text-slate-300">{keyStatus} (IndexedDB)</div></div>
      </div>
      <p className="text-[10px] leading-4 text-slate-500">The private key stays in this browser. Account identity is derived from its public key.</p>
    </section>
  );
}
