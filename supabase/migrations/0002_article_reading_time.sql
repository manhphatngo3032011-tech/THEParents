-- Reading time computed by the database so list pages never need to load article bodies.
-- Roughly 1200 characters/minute for alphabetic scripts, 400 for Chinese.
alter table public.articles add column reading_minutes integer generated always as (
  greatest(1, ceil(char_length(body) / (case when language = 'zh-CN' then 400.0 else 1200.0 end))::integer)
) stored;
