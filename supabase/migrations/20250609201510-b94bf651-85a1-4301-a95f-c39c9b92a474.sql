
-- Create a table to store card visibility preferences
CREATE TABLE public.card_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_type TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a unique index to ensure one row per card type
CREATE UNIQUE INDEX idx_card_preferences_type ON public.card_preferences(card_type);

-- Insert default card preferences for existing cards
INSERT INTO public.card_preferences (card_type, is_visible, position) VALUES
('recent-deals', true, 1),
('deal-pipeline', true, 2),
('top-partners', true, 3),
('activity-feed', true, 4);

-- Insert new card types as initially hidden
INSERT INTO public.card_preferences (card_type, is_visible, position) VALUES
('monthly-revenue-goals', false, 5),
('quick-notes', false, 6),
('partner-performance', false, 7),
('document-tracker', false, 8),
('calendar-integration', false, 9);
