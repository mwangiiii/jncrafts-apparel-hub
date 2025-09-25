import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Images, Star, Upload, Trash2, ChevronUp, ChevronDown, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash/debounce';

interface AdminProductImageManagerProps {
  product: { id: string; name: string };
  onUpdate?: () => void;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  is_active: boolean;
}

const AdminProductImageManager = ({ product, onUpdate }: AdminProductImageManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, product_id, image_url, alt_text, display_order, is_primary, is_active')
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setProductImages(data || []);
    } catch (error: any) {
      console.error('Error fetching images:', error);
      toast({
        title: "Error fetching images",
        description: error.message || "Failed to load product images",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [product.id, toast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    if (isDialogOpen) fetchImages();
  }, [isDialogOpen, fetchImages]);

  const handleImageUpload = useCallback(
    debounce(async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const fileArray = Array.from(files);
      setUploadingImages(fileArray.map(f => f.name));

      try {
        const maxOrder = Math.max(...productImages.map(img => img.display_order || 0), 0);
        const newImages: ProductImage[] = [];

        for (const [index, file] of fileArray.entries()) {
          const fileName = `${product.id}-${uuidv4()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(`thumbnails/${fileName}`, file, { contentType: file.type });
          if (uploadError) throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);

          const imageUrl = `https://ppljsayhwtlogficifar.supabase.co/storage/v1/object/public/images/thumbnails/${fileName}`;
          const newImage: Omit<ProductImage, 'id'> = {
            product_id: product.id,
            image_url: imageUrl,
            alt_text: `${product.name} - Image ${maxOrder + index + 1}`,
            display_order: maxOrder + index + 1,
            is_primary: productImages.length === 0 && index === 0,
            is_active: true,
          };

          const { data, error: insertError } = await supabase
            .from('product_images')
            .insert(newImage)
            .select('id')
            .single();
          if (insertError) throw new Error(`Insert failed for ${file.name}: ${insertError.message}`);

          newImages.push({ ...newImage, id: data.id });
        }

        setProductImages(prev => [...prev, ...newImages]);
        toast({
          title: "Images uploaded",
          description: `Successfully uploaded ${newImages.length} image(s)`,
        });
        await fetchImages();
        onUpdate?.();
      } catch (error: any) {
        console.error('Error uploading images:', error);
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload one or more images",
          variant: "destructive",
        });
      } finally {
        setUploadingImages([]);
      }
    }, 300),
    [product.id, product.name, productImages, toast, onUpdate]
  );

  const handleDeleteImage = useCallback(
    debounce(async (imageId: string) => {
      if (!confirm('Are you sure you want to delete this image?')) return;

      setOperationLoading(imageId);
      try {
        const image = productImages.find(img => img.id === imageId);
        if (!image) throw new Error('Image not found');

        const fileName = image.image_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage.from('images').remove([`thumbnails/${fileName}`]);
          if (storageError) throw new Error(`Storage delete failed: ${storageError.message}`);
        }

        const { error } = await supabase.from('product_images').delete().eq('id', imageId);
        if (error) throw new Error(`Database delete failed: ${error.message}`);

        setProductImages(prev => prev.filter(img => img.id !== imageId));
        toast({
          title: "Image deleted",
          description: "Image has been removed from the product",
        });
        await fetchImages();
        onUpdate?.();
      } catch (error: any) {
        console.error('Error deleting image:', error);
        toast({
          title: "Delete failed",
          description: error.message || "Failed to delete the image",
          variant: "destructive",
        });
        await fetchImages();
      } finally {
        setOperationLoading(null);
      }
    }, 300),
    [productImages, toast, onUpdate]
  );

  const handleMoveImage = useCallback(
    debounce(async (image: ProductImage, direction: 'up' | 'down') => {
      setOperationLoading(image.id);
      try {
        const currentOrder = image.display_order || 0;
        const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
        const targetImage = productImages.find(img => img.display_order === newOrder);
        if (!targetImage) throw new Error('Target image not found');

        setProductImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, display_order: newOrder }
              : img.id === targetImage.id
              ? { ...img, display_order: currentOrder }
              : img
          )
        );

        const [update1, update2] = await Promise.all([
          supabase.from('product_images').update({ display_order: newOrder }).eq('id', image.id),
          supabase.from('product_images').update({ display_order: currentOrder }).eq('id', targetImage.id),
        ]);

        if (update1.error) throw new Error(`Update failed for image ${image.id}: ${update1.error.message}`);
        if (update2.error) throw new Error(`Update failed for target image: ${update2.error.message}`);

        toast({
          title: "Image moved",
          description: `Image moved ${direction}`,
        });
        await fetchImages();
        onUpdate?.();
      } catch (error: any) {
        console.error('Error moving image:', error);
        toast({
          title: "Move failed",
          description: error.message || "Failed to move the image",
          variant: "destructive",
        });
        await fetchImages();
      } finally {
        setOperationLoading(null);
      }
    }, 300),
    [productImages, toast, onUpdate]
  );

  const handleSetAsThumbnail = useCallback(
    debounce(async (image: ProductImage) => {
      setOperationLoading(image.id);
      try {
        setProductImages(prev =>
          prev.map(img => ({
            ...img,
            is_primary: img.id === image.id,
          }))
        );

        await supabase
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', product.id);

        const { error } = await supabase
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', image.id);
        if (error) throw new Error(`Update failed: ${error.message}`);

        toast({
          title: "Thumbnail updated",
          description: "Image set as product thumbnail",
        });
        await fetchImages();
        onUpdate?.();
      } catch (error: any) {
        console.error('Error setting thumbnail:', error);
        toast({
          title: "Update failed",
          description: error.message || "Failed to set image as thumbnail",
          variant: "destructive",
        });
        await fetchImages();
      } finally {
        setOperationLoading(null);
      }
    }, 300),
    [product.id, toast, onUpdate]
  );

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
                  disabled={uploadingImages.length > 0 || operationLoading !== null}
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
            <style>
              {`
                .image-card {
                  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
                }
                .image-card:hover {
                  transform: scale(1.05);
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .thumbnail {
                  border-color: #3b82f6;
                  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
                  animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                  0% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
                  50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5); }
                  100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
                }
              `}
            </style>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : productImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productImages
                  .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                  .map((image) => (
                    <div
                      key={image.id}
                      className={`relative group border-2 rounded-lg overflow-hidden image-card ${
                        image.is_primary ? 'thumbnail' : 'border-border'
                      }`}
                    >
                      <div className="aspect-square">
                        <img
                          src={image.image_url}
                          alt={image.alt_text || `Product image ${image.display_order}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/fallback-image.png'; // Optional fallback
                            console.error(`Failed to load image: ${image.image_url}`);
                          }}
                        />
                      </div>
                      {image.is_primary && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="default" className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Thumbnail
                          </Badge>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                        {image.display_order}
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetAsThumbnail(image)}
                          disabled={operationLoading === image.id}
                          className="h-7 w-7 p-0"
                          title="Set as thumbnail"
                        >
                          {operationLoading === image.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Star className="h-3 w-3" />
                          )}
                        </Button>
                        {image.display_order > 1 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMoveImage(image, 'up')}
                            disabled={operationLoading === image.id}
                            className="h-7 w-7 p-0"
                            title="Move up"
                          >
                            {operationLoading === image.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ChevronUp className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {image.display_order < Math.max(...productImages.map(img => img.display_order || 0)) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMoveImage(image, 'down')}
                            disabled={operationLoading === image.id}
                            className="h-7 w-7 p-0"
                            title="Move down"
                          >
                            {operationLoading === image.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={operationLoading === image.id}
                          className="h-7 w-7 p-0"
                          title="Remove image"
                        >
                          {operationLoading === image.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
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
