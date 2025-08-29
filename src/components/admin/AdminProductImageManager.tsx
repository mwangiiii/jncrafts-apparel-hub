import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Images, 
  Edit3, 
  Star, 
  Upload, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  X,
  Loader2,
  ImageIcon
} from 'lucide-react';
import { useProductImages, useProductMutations } from '@/hooks/useNormalizedProduct';
import { useToast } from '@/hooks/use-toast';
import { Product, ProductImage } from '@/types/database';

interface AdminProductImageManagerProps {
  product: Product;
  onUpdate?: () => void;
}

const AdminProductImageManager = ({ product, onUpdate }: AdminProductImageManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch product images using the normalized hook
  const { 
    data: productImages = [], 
    isLoading, 
    refetch 
  } = useProductImages(product.id);

  // Get mutation hooks
  const {
    addProductImage,
    updateProductImage,
    deleteProductImage
  } = useProductMutations();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setUploadingImages(prev => [...prev, ...fileArray.map(f => f.name)]);

    try {
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is over 10MB limit`,
            variant: "destructive"
          });
          continue;
        }

        // Convert to base64 for storage
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // Determine display order (next available position)
        const maxOrder = Math.max(...productImages.map(img => img.display_order), 0);

        await addProductImage.mutateAsync({
          product_id: product.id,
          image_url: base64,
          alt_text: `${product.name} - Image ${maxOrder + 1}`,
          display_order: maxOrder + 1,
          is_primary: productImages.length === 0 // First image is primary
        });
      }

      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${fileArray.length} image(s)`
      });

      refetch();
      onUpdate?.();
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload one or more images",
        variant: "destructive"
      });
    } finally {
      setUploadingImages([]);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await deleteProductImage.mutateAsync(imageId);
      toast({
        title: "Image deleted",
        description: "Image has been removed from the product"
      });
      refetch();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the image",
        variant: "destructive"
      });
    }
  };

  const handleMoveImage = async (image: ProductImage, direction: 'up' | 'down') => {
    const currentOrder = image.display_order;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    
    // Find the image at the target position
    const targetImage = productImages.find(img => img.display_order === newOrder);
    if (!targetImage) return;

    try {
      // Swap display orders
      await Promise.all([
        updateProductImage.mutateAsync({
          id: image.id,
          display_order: newOrder
        }),
        updateProductImage.mutateAsync({
          id: targetImage.id,
          display_order: currentOrder
        })
      ]);

      toast({
        title: "Image moved",
        description: `Image moved ${direction}`
      });

      refetch();
      onUpdate?.();
    } catch (error) {
      console.error('Error moving image:', error);
      toast({
        title: "Move failed",
        description: "Failed to move the image",
        variant: "destructive"
      });
    }
  };

  const handleSetAsThumbnail = async (image: ProductImage) => {
    try {
      // Update the image to display_order = 1 and move others accordingly
      const sortedImages = [...productImages].sort((a, b) => a.display_order - b.display_order);
      
      // Create new order mapping
      const updates = sortedImages.map((img, index) => {
        if (img.id === image.id) {
          return { id: img.id, display_order: 1, is_primary: true };
        } else if (img.display_order === 1) {
          return { id: img.id, display_order: image.display_order, is_primary: false };
        }
        return null;
      }).filter(Boolean);

      await Promise.all(
        updates.map(update => 
          updateProductImage.mutateAsync(update!)
        )
      );

      toast({
        title: "Thumbnail updated",
        description: "Image set as product thumbnail"
      });

      refetch();
      onUpdate?.();
    } catch (error) {
      console.error('Error setting thumbnail:', error);
      toast({
        title: "Update failed",
        description: "Failed to set image as thumbnail",
        variant: "destructive"
      });
    }
  };

  // Get thumbnail image for the trigger button
  const thumbnailImage = productImages.find(img => img.display_order === 1) || productImages[0];

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Images className="h-4 w-4" />
          Manage Images ({productImages.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Manage Images - {product.name}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Product Images</CardTitle>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('admin-image-upload')?.click()}
                  disabled={uploadingImages.length > 0}
                  className="flex items-center gap-2"
                >
                  {uploadingImages.length > 0 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Add Images
                </Button>
                <input
                  id="admin-image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : productImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productImages
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((image, index) => (
                    <div
                      key={image.id}
                      className={`relative group border-2 rounded-lg overflow-hidden ${
                        image.display_order === 1
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border'
                      }`}
                    >
                      <div className="aspect-square">
                        <img
                          src={image.image_url}
                          alt={image.alt_text || `Product image ${image.display_order}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Thumbnail Badge */}
                      {image.display_order === 1 && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="default" className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Thumbnail
                          </Badge>
                        </div>
                      )}
                      
                      {/* Display Order */}
                      <div className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                        {image.display_order}
                      </div>
                      
                      {/* Image Controls */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {/* Set as Thumbnail */}
                        {image.display_order !== 1 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSetAsThumbnail(image)}
                            className="h-7 w-7 p-0"
                            title="Set as thumbnail"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Move Up */}
                        {image.display_order > 1 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMoveImage(image, 'up')}
                            className="h-7 w-7 p-0"
                            title="Move up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Move Down */}
                        {image.display_order < Math.max(...productImages.map(img => img.display_order)) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMoveImage(image, 'down')}
                            className="h-7 w-7 p-0"
                            title="Move down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteImage(image.id)}
                          className="h-7 w-7 p-0"
                          title="Remove image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No images uploaded yet</p>
                <p className="text-sm text-muted-foreground/75">Click "Add Images" to upload product photos</p>
              </div>
            )}

            {uploadingImages.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">Uploading images...</span>
                </div>
                <div className="space-y-1">
                  {uploadingImages.map((fileName, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {fileName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AdminProductImageManager;