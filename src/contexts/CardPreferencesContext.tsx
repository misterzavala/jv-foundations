
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { CARD_REGISTRY } from "@/components/CardRegistry";
import { CardSize, defaultCardSizes } from "@/utils/cardSizeUtils";

interface CardPreference {
  card_type: string;
  is_visible: boolean;
  position: number;
  size: string;
}

interface CardPreferencesContextType {
  visibleCards: string[];
  loading: boolean;
  toggleCard: (cardId: string, isVisible: boolean) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  getOrderedVisibleCards: () => string[];
  getCardSize: (cardId: string) => CardSize;
  updateCardSizeOptimistic: (cardId: string, newSize: CardSize) => void;
}

const CardPreferencesContext = createContext<CardPreferencesContextType | undefined>(undefined);

interface CardPreferencesProviderProps {
  children: ReactNode;
}

export function CardPreferencesProvider({ children }: CardPreferencesProviderProps) {
  const [visibleCards, setVisibleCards] = useState<string[]>([]);
  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>({});
  const [loading, setLoading] = useState(true);

  // Load card preferences from Supabase
  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('card_preferences')
        .select('card_type, is_visible, position, size')
        .order('position');

      if (error) {
        console.error('Error loading card preferences:', error);
        // Fallback to default visible cards
        setVisibleCards(['recent-deals', 'deal-pipeline', 'top-partners', 'activity-feed']);
        setCardSizes({});
      } else {
        const visible = data
          .filter((pref: CardPreference) => pref.is_visible)
          .map((pref: CardPreference) => pref.card_type);
        
        const sizes = data.reduce((acc: Record<string, CardSize>, pref: CardPreference) => {
          // Map old size values to new ones and ensure valid values
          let validSize: CardSize;
          switch (pref.size) {
            case 'small':
              validSize = 'compact';
              break;
            case 'large':
              validSize = 'expanded';
              break;
            case 'full':
              validSize = 'expanded';
              break;
            case 'compact':
            case 'standard':
            case 'expanded':
              validSize = pref.size as CardSize;
              break;
            default:
              validSize = 'standard';
          }
          acc[pref.card_type] = validSize;
          return acc;
        }, {});
        
        setVisibleCards(visible);
        setCardSizes(sizes);
        console.log('Loaded visible cards:', visible);
        console.log('Loaded card sizes:', sizes);
      }
    } catch (error) {
      console.error('Error loading card preferences:', error);
      setVisibleCards(['recent-deals', 'deal-pipeline', 'top-partners', 'activity-feed']);
      setCardSizes({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  // Toggle card visibility
  const toggleCard = async (cardId: string, isVisible: boolean) => {
    console.log('Toggling card:', cardId, 'to visible:', isVisible);
    
    try {
      const { error } = await supabase
        .from('card_preferences')
        .update({ is_visible: isVisible })
        .eq('card_type', cardId);

      if (error) {
        console.error('Error updating card preference:', error);
        return;
      }

      // Update local state immediately
      setVisibleCards(prev => {
        if (isVisible) {
          if (!prev.includes(cardId)) {
            const newCards = [...prev, cardId];
            console.log('Added card, new visible cards:', newCards);
            return newCards;
          }
          return prev;
        } else {
          const newCards = prev.filter(id => id !== cardId);
          console.log('Removed card, new visible cards:', newCards);
          return newCards;
        }
      });
    } catch (error) {
      console.error('Error toggling card:', error);
    }
  };

  // Force refresh preferences from database
  const refreshPreferences = async () => {
    console.log('Force refreshing card preferences from database');
    await loadPreferences();
  };

  // Get visible cards in the correct order
  const getOrderedVisibleCards = () => {
    const orderedCards = visibleCards
      .filter(cardId => CARD_REGISTRY[cardId]) // Only include cards that exist in registry
      .sort((a, b) => {
        // Sort by position if available, otherwise maintain order
        const aConfig = CARD_REGISTRY[a];
        const bConfig = CARD_REGISTRY[b];
        return 0; // For now, maintain insertion order
      });
    
    console.log('Ordered visible cards:', orderedCards);
    return orderedCards;
  };

  // Get card size for a specific card with fallback to default sizes
  const getCardSize = (cardId: string): CardSize => {
    return cardSizes[cardId] || defaultCardSizes[cardId] || 'standard';
  };

  // Optimistically update card size in local state for immediate UI feedback
  const updateCardSizeOptimistic = (cardId: string, newSize: CardSize) => {
    console.log('Optimistically updating card size:', cardId, 'to', newSize);
    setCardSizes(prev => ({
      ...prev,
      [cardId]: newSize
    }));
  };

  const value = {
    visibleCards,
    loading,
    toggleCard,
    refreshPreferences,
    getOrderedVisibleCards,
    getCardSize,
    updateCardSizeOptimistic
  };

  return (
    <CardPreferencesContext.Provider value={value}>
      {children}
    </CardPreferencesContext.Provider>
  );
}

export function useCardPreferences() {
  const context = useContext(CardPreferencesContext);
  if (context === undefined) {
    throw new Error('useCardPreferences must be used within a CardPreferencesProvider');
  }
  return context;
}
