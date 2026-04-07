-- QuoteTree schema
-- Run this in your Supabase SQL editor

create table if not exists leaves (
  id uuid default gen_random_uuid() primary key,
  content text not null check (char_length(content) <= 280),
  author text not null default 'Anonymous' check (char_length(author) <= 50),
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table leaves enable row level security;

-- Allow anyone to read leaves
create policy "Anyone can read leaves"
  on leaves for select
  using (true);

-- Allow anyone to insert leaves
create policy "Anyone can insert leaves"
  on leaves for insert
  with check (true);

-- Allow anyone to delete leaves (required for the shake/remove feature)
create policy "Anyone can delete leaves"
  on leaves for delete
  using (true);

-- Broadcast INSERT/DELETE to connected browsers (enable “Realtime” for `leaves` in Dashboard if needed)
alter publication supabase_realtime add table leaves;

-- Seed some starter leaves
insert into leaves (content, author) values
  ('The secret of getting ahead is getting started.', 'Mark Twain'),
  ('It always seems impossible until it''s done.', 'Nelson Mandela'),
  ('In the middle of difficulty lies opportunity.', 'Albert Einstein'),
  ('Life is what happens when you''re busy making other plans.', 'John Lennon'),
  ('The only way to do great work is to love what you do.', 'Steve Jobs'),
  ('Be the change you wish to see in the world.', 'Mahatma Gandhi'),
  ('Two roads diverged in a wood, and I took the one less traveled by.', 'Robert Frost'),
  ('You miss 100% of the shots you don''t take.', 'Wayne Gretzky');
