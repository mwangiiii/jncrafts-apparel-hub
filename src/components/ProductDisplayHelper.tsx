// Helper component to handle display of product data in both old and new formats
import { Product, ProductImage, ProductSizeInfo, ProductColorInfo } from '@/types/database';

export const getImageUrl = (image: string | ProductImage): string => {
  if (typeof image === 'string') {
    return image;
  }
  return image?.image_url || '/placeholder.svg';
};

export const getSizeName = (size: string | ProductSizeInfo): string => {
  if (typeof size === 'string') {
    return size;
  }
  return size?.name || '';
};

export const getColorName = (color: string | ProductColorInfo): string => {
  if (typeof color === 'string') {
    return color;
  }
  return color?.name || '';
};

export const getSizeId = (size: string | ProductSizeInfo): string => {
  if (typeof size === 'string') {
    return size;
  }
  return size?.id || size?.name || '';
};

export const getColorId = (color: string | ProductColorInfo): string => {
  if (typeof color === 'string') {
    return color;
  }
  return color?.id || color?.name || '';
};

// Helper to get the primary/first image from a product
export const getPrimaryImage = (product: Product): string => {
  if (!product.images || product.images.length === 0) {
    return '/placeholder.svg';
  }
  
  return getImageUrl(product.images[0]);
};

// Helper to check if product has real sizes/colors (not just empty arrays)
export const hasRealSizes = (product: Product): boolean => {
  return !!(product.sizes && product.sizes.length > 0);
};

export const hasRealColors = (product: Product): boolean => {
  return !!(product.colors && product.colors.length > 0);
};