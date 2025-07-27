
-- First, let's see what size values currently exist in the database
SELECT DISTINCT size, COUNT(*) as count 
FROM public.card_preferences 
GROUP BY size;

-- Remove the existing constraint if it exists
ALTER TABLE public.card_preferences 
DROP CONSTRAINT IF EXISTS card_preferences_size_check;

-- Update ALL existing data to use the new size values, including any unexpected values
UPDATE public.card_preferences 
SET size = CASE 
  WHEN size = 'small' THEN 'compact'
  WHEN size = 'medium' THEN 'standard'
  WHEN size = 'large' THEN 'expanded'
  WHEN size = 'full' THEN 'expanded'
  WHEN size IS NULL THEN 'standard'
  WHEN size = '' THEN 'standard'
  ELSE 'standard'  -- This handles any other unexpected values
END;

-- Now add the new constraint
ALTER TABLE public.card_preferences 
ADD CONSTRAINT card_preferences_size_check 
CHECK (size IN ('compact', 'standard', 'expanded'));

-- Set the default value to use the new naming
ALTER TABLE public.card_preferences 
ALTER COLUMN size SET DEFAULT 'standard';
