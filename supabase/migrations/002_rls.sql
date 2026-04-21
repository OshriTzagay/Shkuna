-- ============================================================
-- שכונה — Row Level Security Policies
-- ============================================================

-- helper: get current user id
create or replace function auth_uid() returns uuid
language sql stable as $$ select auth.uid() $$;

-- helper: is user a member of a team?
create or replace function is_team_member(p_team_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and is_active = true
  )
$$;

-- helper: is user manager or assistant of a team?
create or replace function is_team_admin(p_team_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and role in ('manager', 'assistant')
      and is_active = true
  )
$$;

-- helper: is user manager of a team?
create or replace function is_team_manager(p_team_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and role = 'manager'
      and is_active = true
  )
$$;

-- ─── users ──────────────────────────────────────────────────

alter table users enable row level security;

create policy "users: read own profile"
  on users for select using (id = auth_uid());

create policy "users: update own profile"
  on users for update using (id = auth_uid());

create policy "users: insert own profile"
  on users for insert with check (id = auth_uid());

-- team members can read each other's profiles
create policy "users: team members can read"
  on users for select using (
    exists (
      select 1 from team_members tm1
      join team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth_uid()
        and tm2.user_id = users.id
        and tm1.is_active = true
    )
  );

-- ─── teams ──────────────────────────────────────────────────

alter table teams enable row level security;

create policy "teams: public read"
  on teams for select using (is_public = true);

create policy "teams: member read"
  on teams for select using (is_team_member(id));

create policy "teams: manager update"
  on teams for update using (is_team_manager(id));

create policy "teams: authenticated create"
  on teams for insert with check (auth_uid() is not null);

-- ─── team_members ───────────────────────────────────────────

alter table team_members enable row level security;

create policy "team_members: member read"
  on team_members for select using (is_team_member(team_id));

create policy "team_members: manager manage"
  on team_members for all using (is_team_manager(team_id));

create policy "team_members: self join"
  on team_members for insert with check (user_id = auth_uid());

-- ─── matches ────────────────────────────────────────────────

alter table matches enable row level security;

create policy "matches: member read"
  on matches for select using (is_team_member(team_id));

create policy "matches: admin create/update"
  on matches for insert with check (is_team_admin(team_id));

create policy "matches: admin update"
  on matches for update using (is_team_admin(team_id));

-- ─── match_registrations ────────────────────────────────────

alter table match_registrations enable row level security;

create policy "registrations: member read"
  on match_registrations for select using (
    exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id))
  );

create policy "registrations: self write"
  on match_registrations for insert with check (user_id = auth_uid());

create policy "registrations: self update"
  on match_registrations for update using (user_id = auth_uid());

-- ─── match_teams ────────────────────────────────────────────

alter table match_teams enable row level security;

create policy "match_teams: member read"
  on match_teams for select using (
    exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id))
  );

create policy "match_teams: admin write"
  on match_teams for insert with check (
    exists (select 1 from matches m where m.id = match_id and is_team_admin(m.team_id))
  );

-- ─── match_rounds ───────────────────────────────────────────

alter table match_rounds enable row level security;

create policy "rounds: member read"
  on match_rounds for select using (
    exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id))
  );

create policy "rounds: member write"
  on match_rounds for insert with check (
    exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id))
  );

create policy "rounds: member update"
  on match_rounds for update using (
    exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id))
  );

-- ─── match_results ──────────────────────────────────────────

alter table match_results enable row level security;

create policy "results: member read"
  on match_results for select using (
    exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id))
  );

create policy "results: admin write"
  on match_results for insert with check (
    exists (select 1 from matches m where m.id = match_id and is_team_admin(m.team_id))
  );

create policy "results: admin update"
  on match_results for update using (
    exists (select 1 from matches m where m.id = match_id and is_team_admin(m.team_id))
  );

-- ─── payments ───────────────────────────────────────────────

alter table payments enable row level security;

create policy "payments: member read own"
  on payments for select using (user_id = auth_uid());

create policy "payments: admin read all"
  on payments for select using (
    exists (select 1 from matches m where m.id = match_id and is_team_admin(m.team_id))
  );

create policy "payments: self confirm"
  on payments for update using (user_id = auth_uid());

create policy "payments: admin confirm others"
  on payments for update using (
    exists (select 1 from matches m where m.id = match_id and is_team_admin(m.team_id))
  );

-- ─── match_player_ratings ───────────────────────────────────

alter table match_player_ratings enable row level security;

create policy "ratings: member read"
  on match_player_ratings for select using (
    exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id))
  );

create policy "ratings: admin write"
  on match_player_ratings for insert with check (
    exists (select 1 from matches m where m.id = match_id and is_team_admin(m.team_id))
  );

-- ─── team_points_history ────────────────────────────────────

alter table team_points_history enable row level security;

create policy "points: public read"
  on team_points_history for select using (true);

create policy "points: service write"
  on team_points_history for insert with check (false); -- only via service role / edge functions
