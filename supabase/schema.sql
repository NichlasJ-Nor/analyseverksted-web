-- Analyseverksted — databaseskjema
-- Kjøres i Supabase Dashboard → SQL Editor → "New query" → lim inn → Run

-- Tabell for lagrede analyser. Hele analysetilstanden (P&L, forutsetninger,
-- underlinjer osv.) lagres som én JSON-blokk i "state" — samme struktur som
-- collectState() produserer i dagens app. Dette gjør at vi kan lagre/laste
-- en hel analyse uten en kompleks relasjonell modell.
create table if not exists analyses (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Ny analyse',
  tool        text not null check (tool in ('mc','dcf','invest','portfolio','scenario')),
  state       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Endringslogg (samme idé som E3 i HTML-appen, men nå server-side og
-- knyttet til faktisk bruker i stedet for bare denne nettleseren).
create table if not exists analysis_log (
  id          bigint generated always as identity primary key,
  analysis_id uuid references analyses(id) on delete cascade,
  owner       uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  details     text,
  created_at  timestamptz not null default now()
);

-- Automatisk oppdatering av updated_at ved endring
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_analyses_updated_at on analyses;
create trigger trg_analyses_updated_at
  before update on analyses
  for each row execute function set_updated_at();

-- Rad-nivå-sikkerhet: hver bruker ser og endrer KUN sine egne analyser.
alter table analyses enable row level security;
alter table analysis_log enable row level security;

drop policy if exists "Eiere ser egne analyser" on analyses;
create policy "Eiere ser egne analyser"
  on analyses for select
  using (auth.uid() = owner);

drop policy if exists "Eiere oppretter egne analyser" on analyses;
create policy "Eiere oppretter egne analyser"
  on analyses for insert
  with check (auth.uid() = owner);

drop policy if exists "Eiere oppdaterer egne analyser" on analyses;
create policy "Eiere oppdaterer egne analyser"
  on analyses for update
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

drop policy if exists "Eiere sletter egne analyser" on analyses;
create policy "Eiere sletter egne analyser"
  on analyses for delete
  using (auth.uid() = owner);

drop policy if exists "Eiere ser egen logg" on analysis_log;
create policy "Eiere ser egen logg"
  on analysis_log for select
  using (auth.uid() = owner);

drop policy if exists "Eiere skriver egen logg" on analysis_log;
create policy "Eiere skriver egen logg"
  on analysis_log for insert
  with check (auth.uid() = owner);

-- Indeks for rask henting av "mine analyser, nyest først"
create index if not exists idx_analyses_owner_updated
  on analyses (owner, updated_at desc);
