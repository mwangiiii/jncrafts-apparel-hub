import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionId } from './useSessionId';
import { CartItem, Product } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const usePersistentCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const sessionId = useSessionId();
  const { toast } = useToast();

  // Load cart items on mount or user change
  useEffect(() => {
    if (user || sessionId) {
      loadCartItems();
    }
  }, [user, sessionId]);

  const loadCartItems = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('cart_items_with_details').select('*');
      
      if (user) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (product: Product, quantity: number, size: string, color: string) => {
    try {
      // Use the normalized function to add items to cart
      const { data: cartItemId, error } = await supabase.rpc('add_to_cart_normalized', {
        p_product_id: product.id,
        p_color_name: color,
        p_size_name: size,
        p_quantity: quantity,
        p_price: product.price,
        p_user_id: user?.id || null,
        p_session_id: user ? null : sessionId
      });

      if (error) throw error;

      // Reload cart items to get the updated normalized data
      await loadCartItems();

      // Send admin notification for cart addition
      if (user) {
        try {
          // Get user profile for full name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();

          await supabase.functions.invoke('send-admin-notification', {
            body: {
              type: 'cart_addition',
              customerEmail: user.email || 'Unknown',
              customerName: profile?.full_name || 'Unknown Customer',
              productDetails: {
                name: product.name,
                size,
                color,
                price: product.price,
                quantity
              }
            }
          });
        } catch (notificationError) {
          console.error('Error sending admin notification:', notificationError);
        }
      }

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(itemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive"
      });
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive"
      });
    }
  };

  const clearCart = async () => {
    try {
      let query = supabase.from('cart_items').delete();
      
      if (user) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { error } = await query;
      if (error) throw error;

      setCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive"
      });
    }
  };

  // Migrate guest cart to user cart when user logs in
  const migrateGuestCart = async (newUserId: string) => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ user_id: newUserId, session_id: null })
        .eq('session_id', sessionId);

      if (error) throw error;
      
      // Reload cart items
      await loadCartItems();
    } catch (error) {
      console.error('Error migrating cart:', error);
    }
  };

  return {
    cartItems,
    isLoading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    migrateGuestCart,
    refreshCart: loadCartItems
  };
};