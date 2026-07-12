-- Single-user schema — no user_id, no RLS (see docs/DECISIONS.md D006)

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  logged_date date not null unique,
  weight_kg numeric(5,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  logged_date date not null,
  exercise_type text not null, -- 'walk' | 'run' | 'gym' | 'cycling' | 'other'
  duration_minutes integer,
  distance_km numeric(5,2),
  calories_burned integer, -- optional manual entry
  note text,
  created_at timestamptz not null default now()
);

create table daily_steps (
  logged_date date primary key,
  steps integer not null,
  created_at timestamptz not null default now()
);

-- Cache of LLM-estimated macros, keyed on normalized food name (D003)
create table food_cache (
  normalized_name text primary key,
  calories integer not null,
  protein_g numeric(5,1),
  carbs_g numeric(5,1),
  fat_g numeric(5,1),
  model_used text not null, -- e.g. 'groq/llama-3.3-70b'
  created_at timestamptz not null default now()
);

create table diet_logs (
  id uuid primary key default gen_random_uuid(),
  logged_date date not null,
  food_name text not null,   -- raw user input, e.g. "2 roti with daal"
  quantity text,             -- e.g. "2 roti", "1 plate" — kept separate for cache normalization
  calories integer,
  protein_g numeric(5,1),
  carbs_g numeric(5,1),
  fat_g numeric(5,1),
  source text not null default 'llm', -- 'llm' | 'manual_override'
  created_at timestamptz not null default now()
);

create index idx_exercise_logs_date on exercise_logs (logged_date);
create index idx_diet_logs_date on diet_logs (logged_date);
