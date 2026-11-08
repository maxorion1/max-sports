export interface NodeTelemetry {
  id: string;
  name: string;
  x: number;
  z: number;
  speed: number;
  team: "offense" | "defense";
  pressureLevel: number;
}

export interface PlayPrediction {
  completionProbability: number;
  projectedYardsGained: number;
  recommendedStakeMultiplier: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** A lightweight display estimate based on current telemetry, not a trained or validated model. */
export function computePlayPrediction(
  selectedNode: NodeTelemetry,
  defenders: NodeTelemetry[],
): PlayPrediction {
  const nearestDefenderDistance = defenders.length
    ? Math.min(
        ...defenders.map((defender) =>
          Math.hypot(selectedNode.x - defender.x, selectedNode.z - defender.z),
        ),
      )
    : 12;
  const averagePressure = defenders.length
    ? defenders.reduce((sum, defender) => sum + clamp(defender.pressureLevel, 0, 1), 0) /
      defenders.length
    : 0.25;
  const separation = clamp(nearestDefenderDistance, 0, 20);
  const completionProbability = clamp(
    0.42 + selectedNode.speed * 0.018 + separation * 0.012 - averagePressure * 0.2,
    0.05,
    0.95,
  );
  const projectedYardsGained = clamp(
    Math.round(2 + selectedNode.speed * 0.75 + separation * 0.35 - averagePressure * 4),
    0,
    40,
  );

  return {
    completionProbability,
    projectedYardsGained,
    recommendedStakeMultiplier: Number((1 + completionProbability * 2).toFixed(2)),
  };
}
