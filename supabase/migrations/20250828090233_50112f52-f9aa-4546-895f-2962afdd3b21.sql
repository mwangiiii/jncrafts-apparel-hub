-- Create optimized timezones table to replace slow pg_timezone_names queries
CREATE TABLE public.timezones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timezones ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read timezones
CREATE POLICY "Everyone can view timezones" 
ON public.timezones 
FOR SELECT 
USING (true);

-- Insert all timezone data from pg_catalog (this runs once)
INSERT INTO public.timezones (name)
SELECT name FROM pg_catalog.pg_timezone_names()
ORDER BY name;

-- Create index for fast lookups
CREATE INDEX idx_timezones_name ON public.timezones(name);