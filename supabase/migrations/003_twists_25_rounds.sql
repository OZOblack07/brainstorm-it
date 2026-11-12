-- Run after 001 and 002: allow up to 25 rounds and store each round's twist.
alter table rooms drop constraint if exists rooms_rounds_check;
alter table rooms add constraint rooms_rounds_check check (rounds between 1 and 25);
alter table rounds add column if not exists twist text not null default 'normal';
alter table rounds add column if not exists twist_data jsonb not null default '{}'::jsonb;
