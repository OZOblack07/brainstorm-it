-- Rate limiting (serverless-safe, stored in Postgres) + host review support. Run after 001.
create table rate_limits(user_id uuid, bucket text, window_start timestamptz not null default now(), hits int not null default 0, primary key(user_id,bucket));
alter table rate_limits enable row level security;  -- no policies: only the service role can touch it
create function hit_rate_limit(p_user uuid, p_bucket text, p_max int, p_window int) returns boolean language plpgsql security definer set search_path=public as $$
declare h int;
begin
  insert into rate_limits(user_id,bucket,window_start,hits) values (p_user,p_bucket,now(),1)
  on conflict (user_id,bucket) do update set
    hits = case when rate_limits.window_start < now() - make_interval(secs => p_window) then 1 else rate_limits.hits + 1 end,
    window_start = case when rate_limits.window_start < now() - make_interval(secs => p_window) then now() else rate_limits.window_start end
  returning hits into h;
  return h <= p_max;
end $$;
revoke all on function hit_rate_limit(uuid,text,int,int) from public, anon, authenticated;
