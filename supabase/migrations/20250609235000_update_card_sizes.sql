
-- Update the database constraint to allow the new size values
ALTER TABLE public.card_preferences 
DROP CONSTRAINT IF EXISTS card_preferences_size_check;

ALTER TABLE public.card_preferences 
ADD CONSTRAINT card_preferences_size_check 
CHECK (size IN ('compact', 'standard', 'expanded'));

-- Update existing data to use the new size values
UPDATE public.card_preferences 
SET size = CASE 
  WHEN size = 'small' THEN 'compact'
  WHEN size = 'large' THEN 'expanded'
  WHEN size = 'full' THEN 'expanded'
  WHEN size IS NULL THEN 'standard'
  ELSE 'standard'
END;

-- Set default value to use the new naming
ALTER TABLE public.card_preferences 
ALTER COLUMN size SET DEFAULT 'standard';
