-- Optional: add columns to chatbot_leads for transcript and attribution
ALTER TABLE chatbot_leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE chatbot_leads ADD COLUMN IF NOT EXISTS transcript_id text;
ALTER TABLE chatbot_leads ADD COLUMN IF NOT EXISTS last_question text;
ALTER TABLE chatbot_leads ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE chatbot_leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE chatbot_leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE chatbot_leads ADD COLUMN IF NOT EXISTS utm_campaign text;
