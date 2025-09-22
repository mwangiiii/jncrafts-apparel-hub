import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionId } from './useSessionId';
import { CartItem, Product } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const usePersistentCart = (shouldInitialize: boolean = true) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(shouldInitialize);
  const { user } = useAuth();
  const sessionId = useSessionId();
  const { toast } = useToast();

  // Load cart items on mount or user change - only if initialized
  useEffect(() => {
    if (!shouldInitialize) {
      setIsLoading(false);
      return;
    }
    
    if (user || sessionId) {
      loadCartItems();
    }
  }, [user, sessionId, shouldInitialize]);

  const loadCartItems = async () => {
    // Skip loading state for seamless updates
    try {
      let query = supabase
        .from('cart_items')
        .select(`
          *,
          products!inner(
            id,
            name,
            category,
            description,
            price
          ),
          colors!inner(
            id,
            name,
            hex_code
          ),
          sizes!inner(
            id,
            name,
            category
          ),
          product_images!thumbnail_image_id(
            id,
            image_url
          )
        `);
      
      if (user) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to match expected CartItem structure
      const transformedItems = (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.name || 'Unknown Product',
        product_category: item.products?.category || '',
        product_description: item.products?.description || '',
        product_image: item.product_images?.image_url || '',
        color_name: item.colors?.name || 'Unknown Color',
        color_hex: item.colors?.hex_code || '#000000',
        size_name: item.sizes?.name || 'Unknown Size',
        size_category: item.sizes?.category || 'clothing'
      }));
      
      setCartItems(transformedItems);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive"
      });
    } finally {
      // Only set loading false on initial load
      if (isLoading) setIsLoading(false);
    }
  };

  const addToCart = async (product: Product, quantity: number, size: string, color: string) => {
    try {
      // Get the primary image for the product to store as thumbnail
      let primaryImageId: string | null = null;
      
      if (product.images && product.images.length > 0) {
        // Find primary image or use first image
        const primaryImage = product.images.find(img => 
          typeof img === 'object' && img.is_primary
        ) || product.images[0];
        
        // Extract image ID if it's an object
        if (typeof primaryImage === 'object' && primaryImage.id) {
          primaryImageId = primaryImage.id;
        }
      }

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

      // Update the cart item with thumbnail image reference if we have one
      if (cartItemId && primaryImageId) {
        await supabase
          .from('cart_items')
          .update({ thumbnail_image_id: primaryImageId })
          .eq('id', cartItemId);
      }

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