
-- Add size column to card_preferences table to store card sizes
ALTER TABLE public.card_preferences 
ADD COLUMN size text DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large', 'tall', 'wide'));

-- Update existing records to have default medium size
UPDATE public.card_preferences 
SET size = 'medium' 
WHERE size IS NULL;
