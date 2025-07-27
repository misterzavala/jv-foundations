
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CardSize, getNextCardSize, capitalizeSize } from "@/utils/cardSizeUtils";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";

export function useCardResize() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refreshPreferences, updateCardSizeOptimistic } = useCardPreferences();

  const updateCardSize = useCallback(async (cardId: string, size: CardSize) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('card_preferences')
        .update({ size })
        .eq('card_type', cardId);

      if (error) {
        console.error('Error updating card size:', error);
        toast({
          title: "Error",
          description: "Failed to update card size. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`Card ${cardId} resized to ${size}`);
      return true;
    } catch (error) {
      console.error('Error updating card size:', error);
      toast({
        title: "Error",
        description: "Failed to update card size. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSizeShuffle = useCallback(async (cardId: string) => {
    try {
      setLoading(true);
      
      // Get current card size
      const { data: currentCard, error: fetchError } = await supabase
        .from('card_preferences')
        .select('size')
        .eq('card_type', cardId)
        .single();

      if (fetchError) {
        console.error('Error fetching current card size:', fetchError);
        toast({
          title: "Error",
          description: "Failed to get current card size.",
          variant: "destructive",
        });
        return false;
      }

      // Map old size values to new ones and determine next size
      let currentSize: CardSize;
      switch (currentCard?.size) {
        case 'small':
          currentSize = 'compact';
          break;
        case 'large':
        case 'full':
          currentSize = 'expanded';
          break;
        case 'compact':
        case 'standard':
        case 'expanded':
          currentSize = currentCard.size as CardSize;
          break;
        default:
          currentSize = 'standard';
      }

      const nextSize = getNextCardSize(currentSize);

      // Apply optimistic update immediately for smooth UX
      updateCardSizeOptimistic(cardId, nextSize);

      // Update in database
      const success = await updateCardSize(cardId, nextSize);
      
      if (success) {
        toast({
          title: "Card resized",
          description: `Card size changed to ${capitalizeSize(nextSize)}.`,
        });
        
        // Refresh from database to ensure consistency
        setTimeout(() => refreshPreferences(), 100);
      } else {
        // Revert optimistic update on failure
        updateCardSizeOptimistic(cardId, currentSize);
      }

      return success;
    } catch (error) {
      console.error('Error shuffling card size:', error);
      toast({
        title: "Error",
        description: "Failed to shuffle card size. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateCardSize, toast, updateCardSizeOptimistic, refreshPreferences]);

  const shuffleCards = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all visible cards
      const { data: cards, error: fetchError } = await supabase
        .from('card_preferences')
        .select('id, card_type, position')
        .eq('is_visible', true)
        .order('position');

      if (fetchError) {
        console.error('Error fetching cards:', fetchError);
        return false;
      }

      if (!cards || cards.length === 0) {
        return true;
      }

      // Shuffle the positions
      const shuffledPositions = [...Array(cards.length)].map((_, i) => i + 1).sort(() => Math.random() - 0.5);
      
      // Update each card with new position
      for (let i = 0; i < cards.length; i++) {
        const { error: updateError } = await supabase
          .from('card_preferences')
          .update({ position: shuffledPositions[i] })
          .eq('id', cards[i].id);

        if (updateError) {
          console.error('Error updating card position:', updateError);
          return false;
        }
      }

      console.log('Cards shuffled successfully');
      
      // Refresh preferences to update local state
      await refreshPreferences();
      
      return true;
    } catch (error) {
      console.error('Error shuffling cards:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshPreferences]);

  return {
    updateCardSize,
    handleSizeShuffle,
    shuffleCards,
    loading
  };
}
