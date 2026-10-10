-- FitQuest — estrutura do banco (rode uma vez em: Supabase → SQL Editor → New query → Run).
-- Pode rodar de novo sem problemas (idempotente).

create extension if not exists citext;

-- Perfil público mínimo: liga o nome de usuário à conta (login por usuário + senha).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique check (username ~ '^[a-zA-Z0-9_.]{3,24}$'),
  email text not null,
  created_at timestamptz not null default now()
);

-- Todos os dados do app de cada usuário (dieta, treinos, avaliações, metas, XP...).
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at bigint not null default 0,          -- ms desde epoch (relógio do app)
  synced_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "perfil: dono lê" on public.profiles;
create policy "perfil: dono lê" on public.profiles for select using (auth.uid() = id);

drop policy if exists "dados: dono lê" on public.user_data;
create policy "dados: dono lê" on public.user_data for select using (auth.uid() = user_id);
drop policy if exists "dados: dono cria" on public.user_data;
create policy "dados: dono cria" on public.user_data for insert with check (auth.uid() = user_id);
drop policy if exists "dados: dono altera" on public.user_data;
create policy "dados: dono altera" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "dados: dono apaga" on public.user_data;
create policy "dados: dono apaga" on public.user_data for delete using (auth.uid() = user_id);

-- Cria o perfil automaticamente no cadastro (username vem dos metadados do signUp).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, new.raw_user_meta_data ->> 'username', new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Login por usuário: devolve o e-mail da conta para o signInWithPassword.
create or replace function public.email_for_username(p_username text)
returns text language sql security definer set search_path = public stable as $$
  select email from public.profiles where username = p_username::citext limit 1;
$$;

create or replace function public.username_available(p_username text)
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where username = p_username::citext);
$$;

revoke all on function public.email_for_username(text) from public;
revoke all on function public.username_available(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- Fotos de progresso: bucket privado, cada usuário só acessa a própria pasta (<user_id>/...).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "fotos: dono lê" on storage.objects;
create policy "fotos: dono lê" on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fotos: dono envia" on storage.objects;
create policy "fotos: dono envia" on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fotos: dono altera" on storage.objects;
create policy "fotos: dono altera" on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fotos: dono apaga" on storage.objects;
create policy "fotos: dono apaga" on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
