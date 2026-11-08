CREATE TABLE IF NOT EXISTS user_accounts (
  wallet_address TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'SPORTS_PLUS', 'SPORTS_PRO', 'ELITE', 'ENTERPRISE')),
  simulations_remaining INTEGER NOT NULL DEFAULT 3 CHECK (simulations_remaining >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_tier_expiry
  ON user_accounts(tier, expires_at);
