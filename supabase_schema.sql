-- ============================================================
-- Vida Plena — Esquema Supabase (Fase 1: paridad key-value)
-- Pega TODO esto en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Tabla key-value por usuario. Cada fila guarda un "bloque" JSON
-- (habits, habitLogs, goals, planning, finance, calendar, areas,
--  settings, userProfile, aiConversations).
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  data       jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Seguridad por fila: cada usuario SOLO ve y edita lo suyo.
alter table public.user_data enable row level security;

drop policy if exists "user_data select own" on public.user_data;
drop policy if exists "user_data insert own" on public.user_data;
drop policy if exists "user_data update own" on public.user_data;
drop policy if exists "user_data delete own" on public.user_data;

create policy "user_data select own" on public.user_data
  for select using (auth.uid() = user_id);
create policy "user_data insert own" on public.user_data
  for insert with check (auth.uid() = user_id);
create policy "user_data update own" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data delete own" on public.user_data
  for delete using (auth.uid() = user_id);

-- Mantener updated_at al día (para merge por timestamp en el futuro).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_user_data on public.user_data;
create trigger trg_touch_user_data
  before update on public.user_data
  for each row execute function public.touch_updated_at();

-- ============================================================
-- LISTO. Después, en Authentication → Providers, habilita:
--   • Email  (activado por defecto)
--   • Google (pega el Client ID/Secret de Google Cloud)
-- ============================================================
