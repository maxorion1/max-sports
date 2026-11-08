import {
  getOrCreateSessionKeyPair,
  getSovereignPublicKeyHex,
  signPayload,
} from "../utils/cryptoSession";

export interface ExecuteStakeParams {
  nodeId: string;
  stakeAmount: number;
  walletAddress?: string;
  matchId: string;
}

export interface ExecuteStakeResult {
  success: boolean;
  transactionHash: string;
  status?: string;
  /** Set only by services that actually maintain a token balance. */
  newBalance?: number;
}

export async function executeVectorStake({
  nodeId,
  stakeAmount,
  matchId,
}: ExecuteStakeParams): Promise<ExecuteStakeResult> {
  if (!nodeId.trim()) throw new Error("A telemetry node must be selected.");
  if (!matchId.trim()) throw new Error("A match must be selected.");
  if (!Number.isFinite(stakeAmount) || stakeAmount <= 0 || stakeAmount > 10000) {
    throw new Error("Stake amount must be between 1 and 10,000 tokens.");
  }
  if (!Number.isSafeInteger(stakeAmount)) {
    throw new Error("Stake amount must be a whole number of tokens.");
  }

  const keyPair = await getOrCreateSessionKeyPair();
  const publicKeyHex = await getSovereignPublicKeyHex(keyPair);
  const payload = {
    matchId,
    nodeId,
    stakeAmount,
    timestamp: Date.now(),
    requestId: crypto.randomUUID(),
  };
  const signatureHex = await signPayload(payload, keyPair.privateKey);

  const response = await fetch("/api/stake/sovereign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, publicKeyHex, signatureHex }),
  });

  const result = await response.json() as Partial<ExecuteStakeResult> & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || `Edge request failed (${response.status} ${response.statusText}).`);
  }
  if (result.success !== true || typeof result.transactionHash !== "string") {
    throw new Error("The staking service returned an invalid response.");
  }
  return result as ExecuteStakeResult;
}
