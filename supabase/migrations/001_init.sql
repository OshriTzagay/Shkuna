-- ============================================================
-- שכונה — DB Schema v1
-- ============================================================

-- extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── enums ──────────────────────────────────────────────────

create type user_role as enum ('player', 'assistant', 'manager');
create type match_status as enum ('scheduled', 'active', 'finished', 'cancelled');
create type registration_status as enum ('confirmed', 'waiting', 'cancelled');
create type payment_status as enum ('pending', 'paid', 'exempted');
create type round_winner as enum ('A', 'B', 'D');

-- ─── users ──────────────────────────────────────────────────

create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text unique not null,
  full_name   text not null,
  nickname    text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ─── teams ──────────────────────────────────────────────────

create table teams (
  id                      uuid primary key default uuid_generate_v4(),
  name                    text not null,
  city                    text not null,
  slug                    text unique not null,
  manager_id              uuid not null references users(id) on delete restrict,
  whatsapp_payment_link   text,
  invite_token            text unique not null default encode(gen_random_bytes(16), 'hex'),
  elo_rating              int not null default 1000,
  total_points            int not null default 0,
  is_public               boolean not null default true,
  created_at              timestamptz not null default now()
);

create index teams_slug_idx on teams(slug);
create index teams_elo_idx on teams(elo_rating desc);
create index teams_points_idx on teams(total_points desc);

-- ─── team_members ───────────────────────────────────────────

create table team_members (
  team_id       uuid not null references teams(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  role          user_role not null default 'player',
  skill_rating  int not null default 3 check (skill_rating between 1 and 5),
  joined_at     timestamptz not null default now(),
  is_active     boolean not null default true,
  primary key (team_id, user_id)
);

create index team_members_user_idx on team_members(user_id);

-- ─── matches ────────────────────────────────────────────────

create table matches (
  id                      uuid primary key default uuid_generate_v4(),
  team_id                 uuid not null references teams(id) on delete cascade,
  title                   text not null default 'משחק כדורגל',
  pitch_name              text not null,
  scheduled_at            timestamptz not null,
  status                  match_status not null default 'scheduled',
  total_cost              numeric(10,2),
  cost_per_player         numeric(10,2),
  max_players             int not null default 12,
  created_by              uuid not null references users(id),
  created_at              timestamptz not null default now(),
  -- stopwatch (shared realtime)
  stopwatch_started_at    timestamptz,
  stopwatch_elapsed_sec   int not null default 0,
  stopwatch_running       boolean not null default false
);

create index matches_team_idx on matches(team_id, scheduled_at desc);
create index matches_status_idx on matches(status);

-- ─── match_registrations ────────────────────────────────────

create table match_registrations (
  match_id      uuid not null references matches(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  status        registration_status not null default 'confirmed',
  registered_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index match_reg_match_idx on match_registrations(match_id, status);

-- ─── match_teams (חלוקת קבוצות) ────────────────────────────

create table match_teams (
  id            uuid primary key default uuid_generate_v4(),
  match_id      uuid not null references matches(id) on delete cascade,
  team_letter   char(1) not null check (team_letter in ('A', 'B')),
  player_ids    uuid[] not null,
  generated_at  timestamptz not null default now(),
  generated_by  uuid not null references users(id)
);

create index match_teams_match_idx on match_teams(match_id, generated_at desc);

-- ─── match_rounds (Winner Stays) ────────────────────────────

create table match_rounds (
  id            uuid primary key default uuid_generate_v4(),
  match_id      uuid not null references matches(id) on delete cascade,
  round_number  int not null,
  team_a_ids    uuid[] not null,
  team_b_ids    uuid[] not null,
  winner        round_winner,
  duration_sec  int,
  created_at    timestamptz not null default now(),
  unique (match_id, round_number)
);

create index match_rounds_match_idx on match_rounds(match_id, round_number);

-- ─── match_results ──────────────────────────────────────────

create table match_results (
  match_id      uuid primary key references matches(id) on delete cascade,
  total_rounds  int,
  mvp_user_id   uuid references users(id),
  low_user_id   uuid references users(id),
  ai_summary    text,
  ai_image_url  text,
  created_at    timestamptz not null default now()
);

-- ─── payments ───────────────────────────────────────────────

create table payments (
  match_id      uuid not null references matches(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  amount        numeric(10,2),
  status        payment_status not null default 'pending',
  confirmed_at  timestamptz,
  confirmed_by  uuid references users(id),
  primary key (match_id, user_id)
);

create index payments_match_idx on payments(match_id, status);

-- ─── match_player_ratings ───────────────────────────────────

create table match_player_ratings (
  match_id      uuid not null references matches(id) on delete cascade,
  rated_user_id uuid not null references users(id) on delete cascade,
  rated_by      uuid not null references users(id) on delete cascade,
  rating        int not null check (rating between 1 and 10),
  comment       text,
  created_at    timestamptz not null default now(),
  primary key (match_id, rated_user_id, rated_by)
);

-- ─── team_points_history ────────────────────────────────────

create table team_points_history (
  id            uuid primary key default uuid_generate_v4(),
  team_id       uuid not null references teams(id) on delete cascade,
  match_id      uuid references matches(id) on delete set null,
  points_change int not null,
  new_total     int not null,
  recorded_at   timestamptz not null default now()
);

create index team_points_team_idx on team_points_history(team_id, recorded_at desc);

-- ─── helper functions ───────────────────────────────────────

-- Auto-update cost_per_player when match total_cost changes or confirmed count changes
create or replace function update_cost_per_player()
returns trigger language plpgsql as $$
declare
  confirmed_count int;
begin
  select count(*) into confirmed_count
  from match_registrations
  where match_id = new.id and status = 'confirmed';

  if confirmed_count > 0 and new.total_cost is not null then
    new.cost_per_player := round(new.total_cost / confirmed_count, 2);
  end if;
  return new;
end;
$$;

create trigger trg_cost_per_player
before insert or update of total_cost on matches
for each row execute function update_cost_per_player();

-- Auto-create payment rows when registration is confirmed
create or replace function create_payment_on_confirm()
returns trigger language plpgsql as $$
begin
  if new.status = 'confirmed' then
    insert into payments (match_id, user_id, status)
    values (new.match_id, new.user_id, 'pending')
    on conflict (match_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_create_payment
after insert or update of status on match_registrations
for each row execute function create_payment_on_confirm();
