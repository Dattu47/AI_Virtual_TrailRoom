create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  gender text,
  age int,
  height int,
  weight int,
  chest int,
  waist int,
  hip int,
  preferred_size text,
  skin_tone text,
  undertone text,
  body_goal text,
  occasion text,
  favorite_colors text,
  preferred_styles text,
  body_photo_url text,
  created_at timestamp default now()
);

create table if not exists wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  image_url text,
  category text,
  color text,
  created_at timestamp default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_image_url text,
  product_link text,
  tryon_result_url text,
  fit_score int,
  color_score int,
  occasion_score int,
  verdict text,
  feedback jsonb,
  created_at timestamp default now()
);

alter table profiles enable row level security;
alter table wardrobe_items enable row level security;
alter table analyses enable row level security;
