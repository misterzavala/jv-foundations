
-- First, let's see what size values currently exist and update them
UPDATE public.card_preferences 
SET size = 'small' 
WHERE size IS NULL OR size NOT IN ('small', 'large', 'full');

-- Now add the constraint after cleaning the data
ALTER TABLE public.card_preferences 
DROP CONSTRAINT IF EXISTS card_preferences_size_check;

ALTER TABLE public.card_preferences 
ADD CONSTRAINT card_preferences_size_check 
CHECK (size IN ('small', 'large', 'full'));
