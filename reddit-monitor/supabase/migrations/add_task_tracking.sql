-- Task Queue: Unified tracking for comments and posts
CREATE TABLE IF NOT EXISTS task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid,

  -- Task type: 'comment' or 'post'
  type text NOT NULL DEFAULT 'comment',

  -- Target thread (for comments) or destination (for posts)
  thread_url text,
  subreddit text NOT NULL,
  thread_title text,

  -- Content
  title text,              -- for posts only
  body text NOT NULL,      -- comment text or post body

  -- Execution status
  status text DEFAULT 'queued',  -- queued, assigned, submitted, verified, failed, rejected

  -- Reddit account used
  reddit_account text,

  -- Proof and verification
  proof_url text,
  verified_at timestamptz,
  verification_data jsonb,  -- raw scrape result for disputes
  rejection_reason text,

  -- Worker tracking (from task server)
  task_server_id text,      -- task ID in external task server
  task_code text,           -- code given to worker
  worker_id text,           -- hashed worker identifier

  -- Timestamps
  assigned_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Metrics (populated by verification scrape)
  upvotes integer,

  -- Notes
  notes text
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_queue_user_id ON task_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_project_id ON task_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_type ON task_queue(type);
CREATE INDEX IF NOT EXISTS idx_task_queue_created_at ON task_queue(created_at DESC);

-- Reddit Accounts: Track account health across clients
CREATE TABLE IF NOT EXISTS reddit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  username text NOT NULL,
  status text DEFAULT 'active',  -- active, warning, shadowbanned, banned, retired

  -- Stats
  tasks_completed integer DEFAULT 0,
  tasks_failed integer DEFAULT 0,
  last_used_at timestamptz,

  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, username)
);

CREATE INDEX IF NOT EXISTS idx_reddit_accounts_user_id ON reddit_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_status ON reddit_accounts(status);

-- Enable RLS
ALTER TABLE task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reddit_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own tasks" ON task_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON task_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON task_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own accounts" ON reddit_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own accounts" ON reddit_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_task_queue_updated_at ON task_queue;
CREATE TRIGGER update_task_queue_updated_at
  BEFORE UPDATE ON task_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reddit_accounts_updated_at ON reddit_accounts;
CREATE TRIGGER update_reddit_accounts_updated_at
  BEFORE UPDATE ON reddit_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
