-- Additive-only migration:
-- This ONLY adds optional columns to the existing public.chatbot_leads table.
-- It will not modify or drop any other database objects.

ALTER TABLE public.chatbot_leads ADD COLUMN IF NOT EXISTS transcript_id text;
ALTER TABLE public.chatbot_leads ADD COLUMN IF NOT EXISTS last_question text;
ALTER TABLE public.chatbot_leads ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE public.chatbot_leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.chatbot_leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.chatbot_leads ADD COLUMN IF NOT EXISTS utm_campaign text;
