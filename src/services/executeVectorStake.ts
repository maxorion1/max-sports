export interface ExecuteStakeParams {
  nodeId: string;
  stakeAmount: number;
  walletAddress?: string;
  matchId: string;
}

export interface ExecuteStakeResult {
  success: boolean;
  transactionHash: string;
  newBalance: number;
}

export async function executeVectorStake({
  nodeId,
  stakeAmount,
  walletAddress,
  matchId,
}: ExecuteStakeParams): Promise<ExecuteStakeResult> {
  if (!nodeId.trim()) throw new Error("A telemetry node must be selected.");
  if (!matchId.trim()) throw new Error("A match must be selected.");
  if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
    throw new Error("Stake amount must be a positive number.");
  }

  const response = await fetch("https://portal-os.com/api/stake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matchId,
      nodeId,
      stakeAmount,
      walletAddress: walletAddress || "anonymous_sovereign_node",
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Edge request failed (${response.status} ${response.statusText}).`);
  }

  const result = (await response.json()) as Partial<ExecuteStakeResult>;
  if (
    result.success !== true ||
    typeof result.transactionHash !== "string" ||
    typeof result.newBalance !== "number" ||
    !Number.isFinite(result.newBalance)
  ) {
    throw new Error("The staking service returned an invalid response.");
  }

  return result as ExecuteStakeResult;
}
