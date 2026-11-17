-- Player challenges and votes on opponents' answers. Run after 003.
create table challenges(id uuid primary key default gen_random_uuid(), room_id uuid references rooms on delete cascade, round_id uuid references rounds on delete cascade,
  score_id bigint unique references scores on delete cascade, challenger_id uuid not null, owner_id uuid not null, created_at timestamptz not null default now(), resolved boolean not null default false, outcome text);
create table votes(challenge_id uuid references challenges on delete cascade, user_id uuid not null, accept boolean not null, primary key(challenge_id,user_id));
create index on challenges(round_id);
alter table challenges enable row level security; alter table votes enable row level security;
create policy c_read on challenges for select using (is_member(room_id));
create policy v_read on votes for select using (exists (select 1 from challenges c where c.id = challenge_id and is_member(c.room_id)));
alter publication supabase_realtime add table challenges, votes;
