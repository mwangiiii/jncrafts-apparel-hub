-- Migration: Add system_status table for site lock/unlock
create table if not exists public.system_status(
  id serial primary key,
  status bool not null,
  unlock_at timestamp  
);