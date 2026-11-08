import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface PlayerTelemetry {
  id: string;
  x: number; // Field coordinate X (meters)
  z: number; // Field coordinate Z (meters)
  speed: number;
  team: "offense" | "defense";
  pressureLevel: number; // 0.0 to 1.0 (Arcade pressure halo intensity)
}

interface ArcadeViewportProps {
  telemetryData?: PlayerTelemetry[];
  onNodeSelect?: (playerId: string) => void;
}

export const ArcadeViewport: React.FC<ArcadeViewportProps> = ({
  telemetryData = [],
  onNodeSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const nodesGroupRef = useRef<THREE.Group | null>(null);
  const [xrSupported, setXrSupported] = useState<boolean>(false);

  // Default fallback telemetry state for Arcade Viewport rendering
  const activeTelemetry: PlayerTelemetry[] = telemetryData.length > 0 ? telemetryData : [
    { id: "QB1", x: 0, z: 5, speed: 4.2, team: "offense", pressureLevel: 0.85 },
    { id: "WR1", x: -12, z: -15, speed: 8.7, team: "offense", pressureLevel: 0.2 },
    { id: "CB1", x: -11, z: -14, speed: 8.5, team: "defense", pressureLevel: 0.9 },
    { id: "DE1", x: 1.5, z: 3.5, speed: 6.1, team: "defense", pressureLevel: 0.95 },
  ];

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    // 1. Initialize Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17); // Dark sovereign theme
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);
    sceneRef.current = scene;

    const width = mountNode.clientWidth;
    const height = mountNode.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 35, 45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true; // Enable WebXR spatial pipeline bridge
    mountNode.appendChild(renderer.domElement);

    // Check WebXR Spatial Session Support
    if ("xr" in navigator) {
      (navigator as any).xr?.isSessionSupported("immersive-vr").then((supported: boolean) => {
        setXrSupported(supported);
      });
    }

    // 2. Lighting & Grid Field Geometry
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // 3D Tactical Grid Field (Arcade Mode Grid Floor)
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Field Turf Surface Plane
    const fieldGeo = new THREE.PlaneGeometry(100, 60);
    const fieldMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
    fieldMesh.rotation.x = -Math.PI / 2;
    scene.add(fieldMesh);

    // 3. Dynamic Player Telemetry Nodes & Pressure Halos
    const nodesGroup = new THREE.Group();
    nodesGroupRef.current = nodesGroup;
    scene.add(nodesGroup);

    // Raycaster for user touch/click node selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children, true);

      if (intersects.length > 0 && onNodeSelect) {
        const selectedObject = intersects[0].object;
        if (selectedObject.userData?.id) {
          onNodeSelect(selectedObject.userData.id);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    // 4. WebGL Animation Loop
    let animationFrameId: number;
    const animate = () => {
      // Rotate pressure rings slowly for Arcade visual flair
      nodesGroup.children.forEach((child) => {
        const ring = child.getObjectByName("pressureRing");
        if (ring) {
          ring.rotation.z += 0.02;
        }
      });

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    // 5. Handle Window Resize
    const handleResize = () => {
      if (!mountNode) return;
      const newWidth = mountNode.clientWidth;
      const newHeight = mountNode.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Clean up WebGL Context and event listeners on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.setAnimationLoop(null);
      if (mountNode.contains(renderer.domElement)) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onNodeSelect]);

  // Re-render Telemetry Nodes when props or telemetry updates
  useEffect(() => {
    const nodesGroup = nodesGroupRef.current;
    if (!nodesGroup) return;

    // Clear existing nodes
    while (nodesGroup.children.length > 0) {
      const obj = nodesGroup.children[0];
      nodesGroup.remove(obj);
    }

    // Build new dynamic telemetry meshes
    activeTelemetry.forEach((player) => {
      const playerGroup = new THREE.Group();
      playerGroup.position.set(player.x, 1, player.z);

      // Player Position Mesh (Sphere)
      const color = player.team === "offense" ? 0x00f0ff : 0xff0055;
      const playerGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const playerMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.3,
      });
      const playerMesh = new THREE.Mesh(playerGeo, playerMat);
      playerMesh.userData = { id: player.id };
      playerGroup.add(playerMesh);

      // Arcade Mode Pressure Halo Ring (Glow Overlay)
      const ringGeo = new THREE.RingGeometry(1.2, 1.6 + player.pressureLevel * 0.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: player.pressureLevel > 0.8 ? 0xff0055 : 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const pressureRing = new THREE.Mesh(ringGeo, ringMat);
      pressureRing.name = "pressureRing";
      pressureRing.rotation.x = Math.PI / 2;
      pressureRing.position.y = -0.9;
      playerGroup.add(pressureRing);

      nodesGroup.add(playerGroup);
    });
  }, [activeTelemetry]);

  return (
    <div className="relative w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      {/* 3D Viewport Mount */}
      <div ref={mountRef} className="w-full h-full cursor-pointer" />

      {/* Spatial Arcade Mode Overlay HUD */}
      <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700">
        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-xs font-mono tracking-wider text-cyan-300 uppercase">
          Arcade Mode: Telemetry Active (100Hz)
        </span>
      </div>

      {/* WebXR Spatial Toggle */}
      {xrSupported && (
        <button
          onClick={() => {
            alert("Initiating WebXR Spatial Tabletop Stream...");
          }}
          className="absolute bottom-4 right-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/20 text-xs uppercase tracking-wider transition-all"
        >
          Enter WebXR Spatial Mode
        </button>
      )}
    </div>
  );
};
