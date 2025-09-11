import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      console.log('🔍 FETCHING CATEGORIES - FORCE CORRECT RLS');
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('❌ ERROR FETCHING CATEGORIES:', error);
        throw error;
      }

      console.log('✅ CATEGORIES FETCHED SUCCESSFULLY:', data?.length, 'categories');
      return data as Category[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
    refetchOnMount: true,
  });
};