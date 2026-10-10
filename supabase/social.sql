-- FitQuest — rede social (amigos, ranking, feed de treinos, curtidas).
-- Já aplicado no projeto Fit_Quest via migrations social_01..05. Roda depois de schema.sql.
-- Privacidade: só um resumo (nível, XP, cargas, volume, km) e os treinos concluídos.
-- Dieta, peso, medidas e fotos nunca são publicados.

create table if not exists public.friendships (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null default '', display_name text not null default '',
  is_public boolean not null default true,
  level int not null default 1, title text not null default '', xp int not null default 0,
  streak int not null default 0, best_streak int not null default 0,
  workouts int not null default 0, prs int not null default 0,
  volume_kg bigint not null default 0, cardio_km numeric not null default 0,
  week_start date, week_xp int not null default 0, week_workouts int not null default 0,
  week_volume bigint not null default 0, week_km numeric not null default 0,
  squat numeric not null default 0, bench numeric not null default 0,
  deadlift numeric not null default 0, ohp numeric not null default 0,
  lifts jsonb not null default '{}'::jsonb, achievements int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_workouts (
  id text not null, user_id uuid not null references auth.users (id) on delete cascade,
  date date not null, name text not null default '', type text not null default 'strength',
  sets int not null default 0, volume bigint not null default 0, prs int not null default 0,
  minutes int, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.workout_likes (
  owner_id uuid not null, workout_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, workout_id, user_id),
  foreign key (owner_id, workout_id) references public.shared_workouts (user_id, id) on delete cascade
);

alter table public.friendships enable row level security;
alter table public.social_profiles enable row level security;
alter table public.shared_workouts enable row level security;
alter table public.workout_likes enable row level security;

-- Função auxiliar fora do schema exposto pela API
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.are_friends(a uuid, b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)));
$$;
revoke all on function private.are_friends(uuid, uuid) from public, anon;
grant execute on function private.are_friends(uuid, uuid) to authenticated;

-- username do perfil social vem sempre da conta (não falsificável)
create or replace function public.social_profiles_set_username()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  new.username := coalesce((select username::text from public.profiles where id = new.user_id), '');
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.social_profiles_set_username() from public, anon, authenticated;
drop trigger if exists social_profiles_username on public.social_profiles;
create trigger social_profiles_username before insert or update on public.social_profiles
  for each row execute function public.social_profiles_set_username();

-- RPCs: busca de usuários e lista das minhas amizades (com nomes, mesmo de perfil privado)
-- (corpo completo nas migrations social_02c_search_users e social_04_my_friendships)

-- Políticas (resumo):
--  friendships: envolvidos veem; requester cria (pending); addressee aceita; qualquer um dos dois apaga.
--  social_profiles: vê se público, próprio ou amigo; só o dono cria/altera.
--  shared_workouts: dono e amigos veem; só o dono escreve.
--  workout_likes: dono do treino, quem curtiu e amigos veem; curtir só treinos próprios ou de amigos.
