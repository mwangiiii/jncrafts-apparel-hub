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
      // Get wishlist items with product IDs first
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (wishlistError) throw wishlistError;

      // Get complete product details for each item
      const wishlistItemsWithProducts = await Promise.all(
        (wishlistData || []).map(async (item) => {
          const { data: productData, error: productError } = await supabase
            .rpc('get_product_complete', { p_product_id: item.product_id });

          if (productError) {
            console.error('Error fetching product details:', productError);
            return { ...item, product: null };
          }

          if (!productData || productData.length === 0) {
            return { ...item, product: null };
          }

          const product = productData[0];
          // Transform the product data to match expected format
          const transformedProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            stock_quantity: product.stock_quantity,
            is_active: product.is_active,
            new_arrival_date: product.new_arrival_date,
            thumbnail_index: product.thumbnail_index,
            created_at: product.created_at,
            updated_at: product.updated_at,
            images: Array.isArray(product.images) 
              ? product.images.map((img: any) => ({
                  id: img.id || 'temp',
                  image_url: img.url || img.image_url || img,
                  is_primary: img.is_primary || false,
                  display_order: img.order || img.display_order || 0,
                  product_id: product.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }))
              : [],
            colors: Array.isArray(product.colors) 
              ? product.colors.map((color: any) => ({
                  id: color.id,
                  name: color.name,
                  hex: color.hex || color.hex_code,
                  available: color.available !== false
                }))
              : [],
            sizes: Array.isArray(product.sizes) 
              ? product.sizes.map((size: any) => ({
                  id: size.id,
                  name: size.name,
                  category: size.category,
                  available: size.available !== false
                }))
              : []
          };

          return { ...item, product: transformedProduct };
        })
      );

      const data = wishlistItemsWithProducts.filter(item => item.product !== null);

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