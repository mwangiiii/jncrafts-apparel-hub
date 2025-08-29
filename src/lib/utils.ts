import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ProductImage } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to get image URL from mixed types
export const getImageUrl = (image: string | ProductImage): string => {
  return typeof image === 'string' ? image : image.image_url;
};

// Helper function to get primary image using thumbnail index
export const getPrimaryImage = (images: (string | ProductImage)[] | null | undefined, thumbnailIndex: number = 0): string => {
  if (!images || images.length === 0) {
    return '/placeholder.svg';
  }
  
  // Use thumbnail index if valid, otherwise use first image
  const imageIndex = thumbnailIndex < images.length ? thumbnailIndex : 0;
  return getImageUrl(images[imageIndex]);
};
