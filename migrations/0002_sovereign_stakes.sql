-- Verified browser-key signed stake records. Keep these separate from the existing
-- vector_stakes table, whose account relationship and columns serve the legacy flow.
CREATE TABLE IF NOT EXISTS sovereign_stakes (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  stake_amount INTEGER NOT NULL CHECK (stake_amount > 0 AND stake_amount <= 10000),
  status TEXT NOT NULL CHECK (status = 'VERIFIED'),
  signature_hex TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sovereign_stakes_wallet
  ON sovereign_stakes(wallet_address);
