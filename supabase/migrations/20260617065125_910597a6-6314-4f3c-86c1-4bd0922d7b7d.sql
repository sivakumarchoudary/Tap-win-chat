ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS profiles_is_bot_idx ON public.profiles(is_bot) WHERE is_bot = true;