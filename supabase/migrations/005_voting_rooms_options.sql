-- ONE file that brings any database (after 001 and 002) up to date. Safe to run more than once.
-- (Includes everything from 003 and 004's replacement, so you do not need to run those separately.)
alter table rooms drop constraint if exists rooms_rounds_check;
alter table rooms add constraint rooms_rounds_check check (rounds between 1 and 25);
alter table rounds add column if not exists twist text not null default 'normal';
alter table rounds add column if not exists twist_data jsonb not null default '{}'::jsonb;
alter table rounds drop constraint if exists rounds_status_check;
alter table rounds add constraint rounds_status_check check (status in ('active','voting','done'));
alter table rooms add column if not exists twists text[] not null default '{double,jackpot,risky,lightning,heist,wheel,wordsmith,curse,underdog,finale}';
alter table rooms add column if not exists first_close boolean not null default false;
drop table if exists votes; drop table if exists challenges;   -- old v3 challenge tables
create table if not exists ballots(round_id uuid references rounds on delete cascade, voter_id uuid not null, primary key(round_id,voter_id));
create table if not exists marks(round_id uuid references rounds on delete cascade, score_id bigint references scores on delete cascade, voter_id uuid not null, accept boolean not null, primary key(score_id,voter_id));
create table if not exists learned_words(lk text primary key);
create index if not exists marks_round_idx on marks(round_id);
alter table ballots enable row level security; alter table marks enable row level security; alter table learned_words enable row level security;
drop policy if exists b_read on ballots;
create policy b_read on ballots for select using (exists (select 1 from rounds r where r.id = round_id and is_member(r.room_id)));
drop policy if exists m_read on marks;
create policy m_read on marks for select using (voter_id = auth.uid());   -- nobody sees other people's votes
do $$ begin alter publication supabase_realtime add table ballots; exception when duplicate_object then null; end $$;
notify pgrst, 'reload schema';   -- makes Supabase notice the new columns straight away
-- Check afterwards: this should return 3 rows named ballots, marks, learned_words
select table_name from information_schema.tables where table_schema = 'public' and table_name in ('ballots','marks','learned_words') order by 1;
