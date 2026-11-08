import { useState } from "react";
import { useTelemetryStream } from "./hooks/useTelemetryStream";

type PortalTab = "live" | "stakes" | "manifesto";

const matches = [
  { id: "match_max_01", name: "Match #01: Apex Gridiron", objectId: "max_01" },
  { id: "match_max_02", name: "Match #02: Quantum Showdown", objectId: "max_02" },
];

export default function App() {
  const [selectedMatch, setSelectedMatch] = useState(matches[0].id);
  const [activeTab, setActiveTab] = useState<PortalTab>("live");
  const { telemetry, connectionStatus } = useTelemetryStream({ matchId: selectedMatch });
  const isConnected = connectionStatus === "CONNECTED";

  const tabs: { id: PortalTab; label: string }[] = [
    { id: "live", label: "Live Telemetry" },
    { id: "stakes", label: "Vector Staking" },
    { id: "manifesto", label: "Sovereign Protocol" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-cyan-500 selection:text-black">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <a href="#home" className="flex items-center gap-3" aria-label="MAX-SPORTS home">
            <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.7)]" />
            <span className="text-xl font-black tracking-wider">
              <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">MAX-SPORTS</span>
            </span>
            <span className="hidden rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 font-mono text-xs text-cyan-300 sm:inline">PLANETARY-MAX</span>
          </a>

          <nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                  activeTab === tab.id
                    ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-slate-400">STREAM STATUS</div>
              <div className={`font-mono text-xs ${isConnected ? "text-emerald-400" : "text-amber-300"}`} role="status">
                {connectionStatus.replaceAll("_", " ")}
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Wallet connection is not available yet"
              className="cursor-not-allowed rounded-lg bg-gradient-to-r from-cyan-700 to-indigo-700 px-4 py-2 text-sm font-bold text-white opacity-70"
            >
              Wallet coming soon
            </button>
          </div>
        </div>
      </header>

      <main id="home" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {activeTab === "live" && (
          <section aria-labelledby="live-heading" className="space-y-6">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">The game, in motion</p>
              <h1 id="live-heading" className="text-3xl font-black tracking-tight sm:text-4xl">Live sports telemetry</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Follow player coordinates and live stream status. When a live feed is unavailable, the interface uses simulated telemetry.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <aside className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                  <h2 className="mb-4 text-lg font-bold text-slate-200">Telemetry streams</h2>
                  <div className="space-y-3">
                    {matches.map((match) => {
                      const selected = selectedMatch === match.id;
                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => setSelectedMatch(match.id)}
                          aria-pressed={selected}
                          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selected ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"}`}
                        >
                          <span>
                            <span className="block font-bold">{match.name}</span>
                            <span className="mt-1 block font-mono text-xs text-slate-500">Stream ID: {match.objectId}</span>
                          </span>
                          <span className={`ml-3 h-2.5 w-2.5 shrink-0 rounded-full ${selected && isConnected ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Stream details</h2>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <div className="text-lg font-black text-cyan-400">Live</div>
                      <div className="mt-1 text-xs text-slate-500">Telemetry feed</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <div className="text-lg font-black text-indigo-400">Edge</div>
                      <div className="mt-1 text-xs text-slate-500">Delivery network</div>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="flex min-h-[440px] flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-6 lg:col-span-2" aria-labelledby="vector-heading">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="vector-heading" className="text-xl font-bold">Spatial vector feed</h2>
                    <p className="mt-1 text-xs text-slate-400">Player coordinates and movement metrics for the selected match.</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-xs ${isConnected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                    {isConnected ? "CONNECTED" : connectionStatus.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-center overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs">
                  {telemetry.length === 0 ? (
                    <p className="py-12 text-center text-slate-500">Waiting for telemetry…</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {telemetry.map((node) => (
                        <article key={node.id} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-cyan-300">{node.id}</h3>
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${node.team === "offense" ? "bg-indigo-500/20 text-indigo-300" : "bg-rose-500/20 text-rose-300"}`}>{node.team}</span>
                          </div>
                          <dl className="grid grid-cols-2 gap-2 text-slate-400">
                            <div><dt className="inline">X: </dt><dd className="inline text-white">{node.x.toFixed(2)}</dd></div>
                            <div><dt className="inline">Z: </dt><dd className="inline text-white">{node.z.toFixed(2)}</dd></div>
                            <div><dt className="inline">Speed: </dt><dd className="inline text-white">{node.speed.toFixed(1)} m/s</dd></div>
                            <div><dt className="inline">Pressure: </dt><dd className="inline text-cyan-400">{(node.pressureLevel * 100).toFixed(0)}%</dd></div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span>Match ID: {selectedMatch}</span>
                  <span>Live feed availability may vary.</span>
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === "stakes" && (
          <section aria-labelledby="stakes-heading" className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">Coming soon</p>
            <h1 id="stakes-heading" className="text-2xl font-black">Vector staking</h1>
            <p className="text-sm leading-6 text-slate-400">Explore the concept of locking tactical predictions to match events. Wallet connection and staking transactions are not enabled in this preview.</p>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
              <div className="text-sm text-slate-500">STAKING</div>
              <div className="mt-1 text-xl font-black text-cyan-400">Preview only</div>
            </div>
          </section>
        )}

        {activeTab === "manifesto" && (
          <section aria-labelledby="manifesto-heading" className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">MAX-SPORTS</p>
            <h1 id="manifesto-heading" className="text-2xl font-black">The Sovereign Protocol</h1>
            <p className="text-sm leading-7 text-slate-400">MAX-SPORTS is a sports telemetry experience for exploring player movement, match state, and edge-delivered data. The live feed depends on service availability; simulated data may appear when the feed is unavailable.</p>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-5 text-center font-mono text-[10px] uppercase tracking-widest text-slate-600">
        MAX-SPORTS · Planetary-MAX · Telemetry preview
      </footer>
    </div>
  );
}
