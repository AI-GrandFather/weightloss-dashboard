-- Single-user schema — no user_id, no RLS (see docs/DECISIONS.md D006)

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  logged_date date not null unique,
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 500),
  note text,
  created_at timestamptz not null default now()
);

create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  logged_date date not null,
  exercise_type text not null check (exercise_type in ('walk', 'run', 'gym', 'cycling', 'other')),
  duration_minutes integer check (duration_minutes between 0 and 1440),
  distance_km numeric(5,2) check (distance_km between 0 and 1000),
  calories_burned integer check (calories_burned between 0 and 10000), -- optional manual entry
  note text,
  created_at timestamptz not null default now()
);

create table daily_steps (
  logged_date date primary key,
  steps integer not null check (steps between 0 and 200000),
  created_at timestamptz not null default now()
);

-- Cache of LLM-estimated macros, keyed on normalized food name (D003)
create table food_cache (
  normalized_name text primary key,
  calories integer not null check (calories between 0 and 10000),
  protein_g numeric(5,1) check (protein_g between 0 and 1000),
  carbs_g numeric(5,1) check (carbs_g between 0 and 2000),
  fat_g numeric(5,1) check (fat_g between 0 and 1000),
  model_used text not null, -- e.g. 'groq/llama-3.3-70b'
  created_at timestamptz not null default now()
);

create table diet_logs (
  id uuid primary key default gen_random_uuid(),
  logged_date date not null,
  food_name text not null,   -- raw user input, e.g. "2 roti with daal"
  quantity text,             -- e.g. "2 roti", "1 plate" — kept separate for cache normalization
  calories integer check (calories between 0 and 10000),
  protein_g numeric(5,1) check (protein_g between 0 and 1000),
  carbs_g numeric(5,1) check (carbs_g between 0 and 2000),
  fat_g numeric(5,1) check (fat_g between 0 and 1000),
  source text not null default 'llm', -- 'llm' | 'manual_override'
  created_at timestamptz not null default now()
);

create index idx_exercise_logs_date on exercise_logs (logged_date);
create index idx_diet_logs_date on diet_logs (logged_date);
