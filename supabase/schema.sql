-- Applied to Supabase project ymovhtrgupdohlmkionc via the Supabase MCP.
-- Direct Data API access is intentionally limited to service_role; browser
-- clients use the lunch-orders Edge Function instead.
create table if not exists public.workshop_lunch_orders (
  id uuid primary key default gen_random_uuid(),
  person_key text not null unique,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  meal text not null check (meal in ('原味飯糰','海苔香鬆','泡菜飯糰','鮪魚飯糰','烤肉飯糰','辣豬肉飯糰')),
  created_at timestamptz not null default now()
);

alter table public.workshop_lunch_orders enable row level security;
revoke all on table public.workshop_lunch_orders from public, anon, authenticated;
grant all on table public.workshop_lunch_orders to service_role;

create table if not exists public.workshop_organizer_login (
  id integer primary key check (id = 1),
  salt text not null,
  email_hash text not null
);

alter table public.workshop_organizer_login enable row level security;
revoke all on table public.workshop_organizer_login from public, anon, authenticated;
grant all on table public.workshop_organizer_login to service_role;

-- The organizer's normalized email is stored only as a salted hash in this table.
