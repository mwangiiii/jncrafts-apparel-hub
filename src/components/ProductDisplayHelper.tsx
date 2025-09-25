// components/ProductDisplayHelper.ts
import { Product } from '@/types/database';

export const getPrimaryImage = (product: Product): string => {
  const primaryImage = product.images.find((img) => img.is_primary);
  return primaryImage?.image_url || product.images[0]?.image_url || '/placeholder-image.jpg';
};

export const hasRealSizes = (product: Product): boolean => {
  return Array.isArray(product.sizes) && product.sizes.length > 0;
};

export const hasRealColors = (product: Product): boolean => {
  return Array.isArray(product.colors) && product.colors.length > 0;
};

export const getSizeName = (size: Product['sizes'][0]): string => {
  return size.name;
};

export const getColorName = (color: Product['colors'][0]): string => {
  return color.name;
};