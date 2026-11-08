CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passkey_pubkey TEXT NOT NULL,
    tier_level TEXT CHECK(tier_level IN ('ARCADE', 'QUANT_PRO', 'SYNDICATE')) DEFAULT 'ARCADE',
    token_balance NUMERIC DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vector_stakes (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    vector_type TEXT NOT NULL,
    staked_amount NUMERIC NOT NULL,
    odds_multiplier NUMERIC NOT NULL,
    sim_branch_hash TEXT NOT NULL,
    status TEXT CHECK(status IN ('LOCKED', 'SETTLED_WIN', 'SETTLED_LOSS')) DEFAULT 'LOCKED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS sovereign_rewards (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    asset_type TEXT CHECK(asset_type IN ('WARDROBE_ITEM', 'JURREAUISM_ART_KEY')) NOT NULL,
    asset_token_id TEXT NOT NULL,
    unlocked_via_stake_id TEXT,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);
