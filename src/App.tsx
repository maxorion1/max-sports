import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR } from "@react-three/xr";
import * as THREE from "three";
import { PredictiveSuitePanel } from "./components/PredictiveSuitePanel";
import { VectorStakeSlip, type TelemetryNodeTarget } from "./components/VectorStakeSlip";
import { useTelemetryStream, type PlayerTelemetry } from "./hooks/useTelemetryStream";
import { computePlayPrediction, type NodeTelemetry } from "./utils/predictiveEngine";

const xrStore = createXRStore();
type PortalTab = "live" | "stakes" | "manifesto";

const matches = [
  { id: "match_max_01", name: "Match #01: Apex Gridiron", objectId: "max_01" },
  { id: "match_max_02", name: "Match #02: Quantum Showdown", objectId: "max_02" },
];

function TelemetryField({
  telemetry,
  onSelect,
}: {
  telemetry: PlayerTelemetry[];
  onSelect: (nodeId: string) => void;
}) {
  return (
    <group>
      <gridHelper args={[50, 50, 0x06b6d4, 0x1e293b]} position={[0, -0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#020617" roughness={0.9} />
      </mesh>
      {telemetry.map((node) => {
        const color = node.team === "offense" ? "#38bdf8" : "#fb7185";
        const pressure = Math.min(1, Math.max(0, node.pressureLevel ?? 0.4));
        return (
          <group key={node.id} position={[node.x, 0.5, node.z]}>
            <mesh
              onClick={(event) => {
                event.stopPropagation();
                onSelect(node.id);
              }}
              onPointerOver={() => { document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <sphereGeometry args={[0.6, 32, 32]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
              <ringGeometry args={[0.8, 1, 32]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={pressure} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function toStakeTarget(node: NodeTelemetry): TelemetryNodeTarget {
  const presets: Record<string, Pick<TelemetryNodeTarget, "vectorType" | "baseOdds" | "metricLabel">> = {
    QB1: { vectorType: "POCKET_COLLAPSE", baseOdds: 2.85, metricLabel: "Pocket pressure telemetry" },
    WR1: { vectorType: "SEP_DELTA", baseOdds: 1.95, metricLabel: "Receiver separation telemetry" },
    DE1: { vectorType: "xCOMP_BURST", baseOdds: 3.4, metricLabel: "Pass rush acceleration telemetry" },
  };
  const preset = presets[node.id] ?? {
    vectorType: "YAC_TRAJECTORY" as const,
    baseOdds: 2.1,
    metricLabel: "Player movement telemetry",
  };
  return { id: node.id, ...preset, currentValue: `${node.speed.toFixed(1)} m/s` };
}

export default function App() {
  const [selectedMatch, setSelectedMatch] = useState(matches[0].id);
  const [activeTab, setActiveTab] = useState<PortalTab>("live");
  const [xrMessage, setXrMessage] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { telemetry, connectionStatus } = useTelemetryStream({ matchId: selectedMatch });
  const isConnected = connectionStatus === "CONNECTED";
  const selectedNode = telemetry.find((node) => node.id === selectedNodeId) ?? null;
  const predictiveNode: NodeTelemetry | null = selectedNode
    ? { ...selectedNode, name: selectedNode.id }
    : null;
  const prediction = useMemo(
    () => predictiveNode ? computePlayPrediction(predictiveNode, telemetry.filter((node) => node.team === "defense")) : null,
    [predictiveNode, telemetry],
  );
  const stakeTarget = predictiveNode ? toStakeTarget(predictiveNode) : null;

  const tabs: { id: PortalTab; label: string }[] = [
    { id: "live", label: "Live 3D Viewport" },
    { id: "stakes", label: "Vector Staking" },
    { id: "manifesto", label: "Sovereign Protocol" },
  ];

  const enterVR = async () => {
    setXrMessage("");
    try {
      await xrStore.enterVR();
    } catch {
      setXrMessage("Immersive VR is unavailable. Try a WebXR-compatible headset and browser over HTTPS.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-cyan-500 selection:text-black">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <a href="#home" className="flex items-center gap-3" aria-label="MAX-SPORTS home">
            <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.7)]" />
            <span className="text-xl font-black tracking-wider"><span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">MAX-SPORTS</span></span>
            <span className="hidden rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 font-mono text-xs text-cyan-300 sm:inline">PLANETARY-MAX</span>
          </a>
          <nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${activeTab === tab.id ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-slate-400">STREAM STATUS</div>
              <div className={`font-mono text-xs ${isConnected ? "text-emerald-400" : "text-amber-300"}`} role="status">{connectionStatus.replaceAll("_", " ")}</div>
            </div>
            <button type="button" onClick={enterVR} className="rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90">Enter immersive VR</button>
          </div>
        </div>
      </header>

      <main id="home" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {activeTab === "live" && (
          <section aria-labelledby="live-heading" className="space-y-6">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">The game, in motion</p>
              <h1 id="live-heading" className="text-3xl font-black tracking-tight sm:text-4xl">Live 3D sports telemetry</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Select a player node to see a telemetry-based estimate and stake preview. Estimates refresh with the incoming feed and are illustrative, not validated predictions.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <aside className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                  <h2 className="mb-4 text-lg font-bold text-slate-200">Telemetry streams</h2>
                  <div className="space-y-3">
                    {matches.map((match) => {
                      const selected = selectedMatch === match.id;
                      return <button key={match.id} type="button" onClick={() => { setSelectedMatch(match.id); setSelectedNodeId(null); }} aria-pressed={selected} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selected ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"}`}>
                        <span><span className="block font-bold">{match.name}</span><span className="mt-1 block font-mono text-xs text-slate-500">Stream ID: {match.objectId}</span></span>
                        <span className={`ml-3 h-2.5 w-2.5 shrink-0 rounded-full ${selected && isConnected ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`} />
                      </button>;
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Stream status</h2>
                  <p className={`font-mono text-sm ${isConnected ? "text-emerald-400" : "text-amber-300"}`}>{connectionStatus.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Live data depends on service availability. Fallback mode displays simulated movement.</p>
                </div>
              </aside>

              <section className="flex h-[520px] flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl sm:h-[650px] lg:col-span-3" aria-labelledby="viewport-heading">
                <div className="mb-3 flex items-center justify-between gap-3 px-2">
                  <div><h2 id="viewport-heading" className="text-lg font-bold">Arcade 3D spatial viewport</h2><p className="text-xs text-slate-400">Select a player node · WebXR supported on compatible devices</p></div>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-300">3D VIEW</span>
                </div>
                <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  <Canvas camera={{ position: [0, 15, 20], fov: 50 }}>
                    <XR store={xrStore}>
                      <color attach="background" args={["#020617"]} />
                      <ambientLight intensity={0.8} />
                      <pointLight position={[10, 20, 10]} intensity={1.5} />
                      <TelemetryField telemetry={telemetry} onSelect={setSelectedNodeId} />
                      <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2 - 0.05} />
                    </XR>
                  </Canvas>
                  {telemetry.length === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/60 text-sm text-slate-300">Waiting for telemetry…</div>}
                </div>
                {xrMessage && <p role="alert" className="mt-3 text-sm text-amber-300">{xrMessage}</p>}
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>Match ID: {selectedMatch}</span><span>{telemetry.length} telemetry nodes · click a node for estimates</span></div>
              </section>
            </div>

            {selectedNode && predictiveNode && (
              <div className="grid gap-6 lg:grid-cols-2">
                <PredictiveSuitePanel selectedNode={predictiveNode} prediction={prediction} />
                <VectorStakeSlip targetNode={stakeTarget} onClose={() => setSelectedNodeId(null)} matchId={selectedMatch} />
              </div>
            )}
          </section>
        )}

        {activeTab === "stakes" && <section aria-labelledby="stakes-heading" className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl sm:p-8"><p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">Coming soon</p><h1 id="stakes-heading" className="text-2xl font-black">Vector staking</h1><p className="text-sm leading-6 text-slate-400">Wallet connection and staking transactions are not enabled in this preview.</p></section>}
        {activeTab === "manifesto" && <section aria-labelledby="manifesto-heading" className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl sm:p-8"><p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">MAX-SPORTS</p><h1 id="manifesto-heading" className="text-2xl font-black">The Sovereign Protocol</h1><p className="text-sm leading-7 text-slate-400">MAX-SPORTS is a sports telemetry experience for exploring player movement, match state, and edge-delivered data. Live feed availability may vary; estimates are illustrative and based on current telemetry.</p></section>}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-5 text-center font-mono text-[10px] uppercase tracking-widest text-slate-600">MAX-SPORTS · Planetary-MAX · Telemetry preview</footer>
    </div>
  );
}
