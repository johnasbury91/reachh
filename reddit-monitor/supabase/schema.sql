-- Supabase Schema for Reddit Monitor MVP
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  keywords text[] default '{}',
  subreddits text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Opportunities (queued items)
create table public.opportunities (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  reddit_id text not null,
  title text not null,
  url text not null,
  subreddit text not null,
  score integer default 0,
  num_comments integer default 0,
  body text,
  reddit_created_at timestamp with time zone,
  status text default 'queued' check (status in ('queued', 'posted', 'skipped')),
  comment_url text,
  posted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, reddit_id)
);

-- Row Level Security (RLS) policies

-- Enable RLS
alter table public.projects enable row level security;
alter table public.opportunities enable row level security;

-- Projects: users can only see/edit their own projects
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Opportunities: users can only access opportunities in their projects
create policy "Users can view opportunities in own projects"
  on public.opportunities for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = opportunities.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create opportunities in own projects"
  on public.opportunities for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = opportunities.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update opportunities in own projects"
  on public.opportunities for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = opportunities.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete opportunities in own projects"
  on public.opportunities for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = opportunities.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Indexes for performance
create index idx_projects_user_id on public.projects(user_id);
create index idx_opportunities_project_id on public.opportunities(project_id);
create index idx_opportunities_status on public.opportunities(status);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger for projects updated_at
create trigger on_project_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- User profiles (extends auth.users)
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  credits integer default 0,
  email_preferences jsonb default '{"marketing": true, "weekly_summary": true, "activity": true}'::jsonb,
  onboarding_completed boolean default false,
  last_active_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Email logs table
create table public.email_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  email_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Credit purchases table
create table public.credit_purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_payment_intent_id text,
  credits integer not null,
  amount integer not null, -- in cents
  status text default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for new tables
alter table public.user_profiles enable row level security;
alter table public.email_logs enable row level security;
alter table public.credit_purchases enable row level security;

-- User profiles policies
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- Email logs policies (users can view their own logs)
create policy "Users can view own email logs"
  on public.email_logs for select
  using (auth.uid() = user_id);

-- Email logs insert policy for service role only (via API)
create policy "Service can insert email logs"
  on public.email_logs for insert
  with check (true);

-- Credit purchases policies
create policy "Users can view own purchases"
  on public.credit_purchases for select
  using (auth.uid() = user_id);

-- Indexes
create index idx_email_logs_user_id on public.email_logs(user_id);
create index idx_email_logs_type on public.email_logs(email_type);
create index idx_email_logs_created_at on public.email_logs(created_at);
create index idx_credit_purchases_user_id on public.credit_purchases(user_id);
create index idx_user_profiles_last_active on public.user_profiles(last_active_at);

-- Trigger for user_profiles updated_at
create trigger on_user_profile_updated
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

-- Function to create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
