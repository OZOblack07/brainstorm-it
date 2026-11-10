-- Brainstorm It schema. Run in Supabase SQL editor (or `supabase db push`).
create table profiles(id uuid primary key references auth.users on delete cascade, username text, avatar text default '🧠', games_played int default 0, created_at timestamptz default now());
create table categories(id serial primary key, name text unique not null, is_default boolean default true);
insert into categories(name) values ('Name'),('Country'),('City'),('Animal'),('Food'),('Fruit'),('Thing'),('Occupation'),('Brand'),('Celebrity'),('Movie'),('Sport');
create table rooms(id uuid primary key default gen_random_uuid(), code text unique not null, host_id uuid not null references auth.users on delete cascade,
  is_public boolean default false, status text not null default 'lobby' check (status in ('lobby','playing','between','finished')),
  categories text[] not null, duration int not null check (duration between 20 and 300), rounds int not null check (rounds between 1 and 15),
  unique_points int not null default 10, created_at timestamptz default now());
create table room_members(room_id uuid references rooms on delete cascade, user_id uuid references auth.users on delete cascade, nickname text not null,
  avatar text default '🧠', ready boolean default false, kicked boolean default false, total_score int default 0, last_submitted_round int default 0,
  joined_at timestamptz default now(), primary key(room_id,user_id));
create table rounds(id uuid primary key default gen_random_uuid(), room_id uuid references rooms on delete cascade, number int not null, letter char(1) not null,
  started_at timestamptz default now(), ends_at timestamptz not null, status text not null default 'active' check (status in ('active','done')), unique(room_id,number));
create table answers(round_id uuid references rounds on delete cascade, user_id uuid references auth.users on delete cascade, room_id uuid references rooms on delete cascade,
  data jsonb not null, submitted_at timestamptz default now(), primary key(round_id,user_id));  -- PK = duplicate-request / modification protection
create table scores(id bigserial primary key, room_id uuid references rooms on delete cascade, round_id uuid references rounds on delete cascade, user_id uuid,
  category text, answer text, status text, points int, reason text, flagged boolean default false);
create table match_history(id bigserial primary key, user_id uuid references auth.users on delete cascade, room_id uuid, nickname text, score int, rank int, played_at timestamptz default now());
create index on room_members(user_id); create index on rounds(room_id,number desc); create index on scores(round_id); create index on scores(room_id);
create index on rooms(is_public,status) where is_public; create index on match_history(user_id);
create view leaderboard as select user_id, max(nickname) nickname, sum(score)::int total, count(*)::int games, count(*) filter (where rank=1)::int wins from match_history group by user_id;
grant select on leaderboard to anon, authenticated;

create function is_member(r uuid) returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from room_members where room_id=r and user_id=auth.uid() and not kicked) $$;
create function new_profile() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into profiles(id,username) values (new.id,'Player'||substr(new.id::text,1,4)) on conflict do nothing; return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function new_profile();

alter table profiles enable row level security; alter table categories enable row level security; alter table rooms enable row level security;
alter table room_members enable row level security; alter table rounds enable row level security; alter table answers enable row level security;
alter table scores enable row level security; alter table match_history enable row level security;
create policy p_prof_r on profiles for select using (true);
create policy p_prof_u on profiles for update using (id=auth.uid());
create policy p_cat_r on categories for select using (true);
create policy p_room_r on rooms for select using (is_public or host_id=auth.uid() or is_member(id));   -- private rooms are invisible without membership
create policy p_mem_r on room_members for select using (is_member(room_id));
create policy p_rnd_r on rounds for select using (is_member(room_id));
create policy p_ans_r on answers for select using (user_id=auth.uid());   -- other players' raw answers are never readable mid-round
create policy p_sco_r on scores for select using (is_member(room_id));    -- scores only exist after a round is finished
create policy p_mh_r on match_history for select using (user_id=auth.uid());
-- No insert/update/delete policies: ALL writes go through server API routes using the service-role key.
alter publication supabase_realtime add table rooms, room_members, rounds, scores;
