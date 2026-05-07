-- ============================================
-- DEALFALCON DATABASE SCHEMA
-- Version: 1.0 — Mai 2026
-- Kopiere dieses gesamte Skript in den Supabase SQL Editor und klicke "Run"
-- ============================================

-- ============================================
-- 1. WORKSPACES (Firma/Account)
-- ============================================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'team',
  brand jsonb default '{}'::jsonb,
  company jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 2. PROFILES (Erweiterung von auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text,
  email text not null,
  role text default 'admin' check (role in ('admin', 'vertrieb', 'betrachter')),
  status text default 'active' check (status in ('active', 'pending', 'inactive')),
  vacation_active boolean default false,
  vacation_from timestamptz,
  vacation_to timestamptz,
  vacation_delegate_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_workspace on public.profiles(workspace_id);

-- ============================================
-- 3. CUSTOMERS (Mini-CRM)
-- ============================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_number text,
  company_name text not null,
  address text,
  comment text,
  lead_user_id uuid references public.profiles(id),
  contacts jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_customers_workspace on public.customers(workspace_id);

-- ============================================
-- 4. DEALS (Vorgänge)
-- ============================================
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  deal_number text not null,
  title text,
  value numeric default 0,
  status text default 'draft' check (status in ('draft', 'sent', 'opened', 'won', 'lost')),
  customer text,
  customer_company text,
  description text,
  delivery text,
  payment text,
  valid_until text,
  pdf_file jsonb,
  pdf_versions jsonb default '[]'::jsonb,
  folders jsonb default '[]'::jsonb,
  video_files jsonb default '[]'::jsonb,
  closed_at timestamptz,
  close_reason text,
  close_note text,
  lead_user_id uuid references public.profiles(id),
  collaborators jsonb default '[]'::jsonb,
  lead_history jsonb default '[]'::jsonb,
  temp_delegations jsonb default '[]'::jsonb,
  notes jsonb default '[]'::jsonb,
  team_messages jsonb default '[]'::jsonb,
  section_timings jsonb default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_deals_workspace on public.deals(workspace_id);
create index idx_deals_status on public.deals(workspace_id, status);
create index idx_deals_lead on public.deals(workspace_id, lead_user_id);

-- ============================================
-- 5. RECIPIENTS (Empfänger der Microsite)
-- ============================================
create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  contact_id text,
  name text not null,
  email text not null,
  company text,
  position text,
  role text default 'primary' check (role in ('primary', 'secondary')),
  persona text default 'normal',
  forwarded_by uuid references public.recipients(id),
  forward_comment text,
  added_at timestamptz default now()
);

create index idx_recipients_deal on public.recipients(deal_id);

-- ============================================
-- 6. ACTIVITIES (Aktivitäts-Stream)
-- ============================================
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  recipient_id uuid references public.recipients(id) on delete cascade,
  type text not null,
  detail text,
  metadata jsonb default '{}'::jsonb,
  simulated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_activities_deal on public.activities(deal_id);
create index idx_activities_recipient on public.activities(recipient_id);
create index idx_activities_type on public.activities(deal_id, type);

-- ============================================
-- 7. NOTIFICATIONS
-- ============================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  message_id uuid,
  type text not null,
  label text,
  detail text,
  read boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- ============================================
-- 8. DOCUMENTS (Bibliothek)
-- ============================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  folder_id text not null,
  folder_name text not null,
  file_name text not null,
  file_url text,
  file_size integer,
  file_type text,
  created_at timestamptz default now()
);

create index idx_documents_workspace on public.documents(workspace_id);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) - WICHTIG!
-- Sorgt dafür, dass User nur ihre eigenen Daten sehen
-- ============================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Profiles sind im eigenen Workspace sichtbar"
  on public.profiles for select
  using (workspace_id in (select workspace_id from public.profiles where id = auth.uid()));
create policy "Eigenes Profil bearbeiten"
  on public.profiles for update
  using (id = auth.uid());

-- Workspaces
alter table public.workspaces enable row level security;
create policy "Eigenen Workspace sehen"
  on public.workspaces for select
  using (id in (select workspace_id from public.profiles where id = auth.uid()));
create policy "Workspace-Admins können bearbeiten"
  on public.workspaces for update
  using (id in (select workspace_id from public.profiles where id = auth.uid() and role = 'admin'));

-- Customers
alter table public.customers enable row level security;
create policy "Customers im eigenen Workspace"
  on public.customers for all
  using (workspace_id in (select workspace_id from public.profiles where id = auth.uid()));

-- Deals
alter table public.deals enable row level security;
create policy "Deals im eigenen Workspace"
  on public.deals for all
  using (workspace_id in (select workspace_id from public.profiles where id = auth.uid()));

-- Recipients (über Deal-Workspace)
alter table public.recipients enable row level security;
create policy "Recipients über Deal-Workspace"
  on public.recipients for all
  using (deal_id in (select id from public.deals where workspace_id in (select workspace_id from public.profiles where id = auth.uid())));

-- Activities (über Deal-Workspace, plus öffentlicher INSERT für Tracking)
alter table public.activities enable row level security;
create policy "Activities über Deal-Workspace lesen"
  on public.activities for select
  using (deal_id in (select id from public.deals where workspace_id in (select workspace_id from public.profiles where id = auth.uid())));
create policy "Activities über Service-Role einfügen"
  on public.activities for insert
  with check (true);

-- Notifications
alter table public.notifications enable row level security;
create policy "Eigene Notifications"
  on public.notifications for all
  using (user_id = auth.uid());

-- Documents
alter table public.documents enable row level security;
create policy "Documents im eigenen Workspace"
  on public.documents for all
  using (workspace_id in (select workspace_id from public.profiles where id = auth.uid()));

-- ============================================
-- 10. ÖFFENTLICHER ZUGRIFF FÜR EMPFÄNGER-MICROSITES
-- Empfänger müssen Deals lesen können ohne Login (über deal_id + recipient_id in URL)
-- ============================================

-- Hinweis: Der öffentliche Zugriff auf Microsites wird über die Service-Role
-- in den API-Endpunkten geregelt (api/microsite/[deal]/[recipient]).
-- So bleibt die DB sicher, aber Empfänger können ihre Microsite öffnen.

-- ============================================
-- 11. AUTO-PROFILE BEI SIGNUP
-- Wenn ein User sich registriert, wird automatisch ein Workspace + Profil angelegt
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  -- Workspace anlegen
  insert into public.workspaces (name)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'Mein Workspace'))
  returning id into new_workspace_id;

  -- Profile anlegen
  insert into public.profiles (id, workspace_id, name, email, role, status)
  values (
    new.id,
    new_workspace_id,
    coalesce(new.raw_user_meta_data->>'name', 'Neuer Nutzer'),
    new.email,
    'admin',
    'active'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FERTIG! Schema ist eingerichtet.
-- ============================================
