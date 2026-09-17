CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id text NOT NULL UNIQUE,
  username text NOT NULL,
  email text,
  ptero_user_id integer UNIQUE,
  coins bigint NOT NULL DEFAULT 0 CHECK (coins >= 0),
  blacklisted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_blacklisted_idx ON users(blacklisted);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ptero_node_id integer NOT NULL UNIQUE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  minecraft_slot_total integer NOT NULL DEFAULT 0 CHECK(minecraft_slot_total >= 0),
  code_slot_total integer NOT NULL DEFAULT 0 CHECK(code_slot_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS node_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  nest_id integer NOT NULL,
  egg_id integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE(node_id,nest_id,egg_id)
);
CREATE INDEX IF NOT EXISTS node_policies_node_idx ON node_policies(node_id,enabled);

CREATE TABLE IF NOT EXISTS servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  ptero_server_id integer UNIQUE,
  ptero_identifier text UNIQUE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  node_id uuid REFERENCES nodes(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL CHECK(category IN ('minecraft','code')),
  nest_id integer NOT NULL,
  egg_id integer NOT NULL,
  version text,
  suspended boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS servers_owner_idx ON servers(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS servers_node_idx ON servers(node_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS server_access (
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(server_id,user_id)
);

CREATE TABLE IF NOT EXISTS coin_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  amount bigint NOT NULL CHECK(amount <> 0),
  type text NOT NULL,
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coin_ledger_user_idx ON coin_ledger(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_discord_id text,
  action text NOT NULL,
  target_type text,
  target_id text,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS interaction_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX IF NOT EXISTS interaction_sessions_lookup ON interaction_sessions(discord_user_id,kind,expires_at);

CREATE TABLE IF NOT EXISTS operation_keys (
  idempotency_key text PRIMARY KEY,
  operation text NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  type text NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed')),
  attempts integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operation_jobs_status_idx ON operation_jobs(status,created_at);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings(key,value) VALUES
 ('slot_defaults','{"minecraft":100,"code":100}'),
 ('theme','{"accent":"#e0002a","background":"#050507","glassOpacity":0.62,"blur":22,"radius":18,"density":"comfortable"}')
ON CONFLICT(key) DO NOTHING;
