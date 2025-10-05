import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WishlistItem, Product } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadWishlist();
    } else {
      setWishlistItems([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadWishlist = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_user_wishlist_complete', { p_user_id: user.id });

      if (error) throw error;

      setWishlistItems(data || []);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to load wishlist",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToWishlist = async (productId: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add items to your wishlist",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if already in wishlist
      const exists = wishlistItems.some(item => item.product_id === productId);
      if (exists) {
        toast({
          title: "Already in wishlist",
          description: "This item is already in your wishlist",
        });
        return;
      }

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: user.id,
          product_id: productId
        })
        .select('*')
        .single();

      if (error) throw error;

      // Reload wishlist to get complete product data
      await loadWishlist();
      toast({
        title: "Added to wishlist",
        description: "Item has been added to your wishlist",
      });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to add item to wishlist",
        variant: "destructive"
      });
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.product_id !== productId));
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist",
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive"
      });
      // Revert optimistic update on error
      await loadWishlist();
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.some(item => item.product_id === productId);
  };

  return {
    wishlistItems,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist: loadWishlist
  };
};