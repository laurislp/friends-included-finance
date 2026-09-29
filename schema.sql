-- Friends Included Ltd. source-of-truth schema. Run once in Supabase SQL Editor.
create table if not exists employees (
  id text primary key,
  name text not null,
  role text not null check (role in ('manager','sales','expenses')),
  telegram_user_id bigint unique,
  telegram_chat_id bigint,
  created_at timestamptz not null default now()
);

insert into employees (id,name,role) values
 ('svetlana','Svetlana de Monte Carlo','manager'),
 ('richard','Richard “Call Me Dick” Darling','sales'),
 ('anastasia','Anastasia Ferrari','sales'),
 ('jean-claude','Jean-Claude Bērziņš','sales'),
 ('kevin','Kevin von Whatever','expenses')
on conflict (id) do update set name=excluded.name, role=excluded.role;

create table if not exists transactions (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 type text not null check (type in ('sale','expense')),
 submitted_by text not null references employees(id),
 origin text not null check (origin in ('web','telegram')),
 origin_chat_id bigint,
 submitted_at timestamptz not null default now(),
 customer text,
 project text check (project in ('A','B')),
 description text not null,
 amount numeric(12,2) not null check (amount > 0),
 status text not null default 'Pending' check (status in ('Pending','Approved')),
 proposed_split jsonb,
 final_split jsonb,
 commission_pool numeric(12,2) not null default 0,
 earned jsonb,
 category text check (category in ('Materials','Travel','Other')),
 proposed_allocation text check (proposed_allocation in ('A','B','Overhead')),
 final_allocation text check (final_allocation in ('A','B','Overhead')),
 approval_at timestamptz,
 notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed','not-applicable')),
 notification_error text,
 sheets_status text not null default 'pending' check (sheets_status in ('pending','synced','failed')),
 sheets_error text
);
create index if not exists transactions_submitted_by_idx on transactions(submitted_by);
create index if not exists transactions_status_idx on transactions(status);

alter table employees enable row level security;
alter table transactions enable row level security;
-- Public browser never receives database credentials; all reads/writes pass through server routes.

