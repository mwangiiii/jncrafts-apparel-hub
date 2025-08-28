import { Product, ProductImage, ProductSizeInfo, ProductColorInfo } from '@/types/database';

// Helper function to get product thumbnail
export const getProductThumbnail = (product: Product): string | undefined => {
  if (!product.images || product.images.length === 0) return undefined;
  
  const firstImage = product.images[0];
  return typeof firstImage === 'string' ? firstImage : firstImage.image_url;
};

// Alias for getProductThumbnail for backward compatibility
export const getPrimaryImage = getProductThumbnail;

// Helper function to get product sizes as strings
export const getProductSizes = (product: Product): string[] => {
  if (!product.sizes) return [];
  
  return product.sizes.map(size => 
    typeof size === 'string' ? size : size.name
  );
};

// Helper function to get product colors as strings
export const getProductColors = (product: Product): string[] => {
  if (!product.colors) return [];
  
  return product.colors.map(color => 
    typeof color === 'string' ? color : color.name
  );
};

// Helper function to get all product images as URLs
export const getProductImages = (product: Product): string[] => {
  if (!product.images) return [];
  
  return product.images.map(image => 
    typeof image === 'string' ? image : image.image_url
  );
};

// Helper function to format product for display
export const formatProductForDisplay = (product: Product) => {
  return {
    ...product,
    thumbnail: getProductThumbnail(product),
    imageUrls: getProductImages(product),
    sizeNames: getProductSizes(product),
    colorNames: getProductColors(product)
  };
};

// Check if product has real sizes (more than just default)
export const hasRealSizes = (product: Product): boolean => {
  const sizes = getProductSizes(product);
  return sizes.length > 0 && !sizes.every(size => size === 'One Size');
};

// Check if product has real colors (more than just default)  
export const hasRealColors = (product: Product): boolean => {
  const colors = getProductColors(product);
  return colors.length > 0 && !colors.every(color => color === 'Default');
};

// Get size name (string) - for backward compatibility
export const getSizeName = (size: string | ProductSizeInfo): string => {
  return typeof size === 'string' ? size : size.name;
};

// Get color name (string) - for backward compatibility
export const getColorName = (color: string | ProductColorInfo): string => {
  return typeof color === 'string' ? color : color.name;
};