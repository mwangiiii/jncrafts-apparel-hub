import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Star, 
  Play,
  Trash2,
  Edit3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductMedia {
  images: string[];
  videos: string[];
  thumbnailIndex: number;
}

interface ProductMediaManagerProps {
  media: ProductMedia;
  onMediaChange: (media: ProductMedia) => void;
}

const ProductMediaManager = ({ media, onMediaChange }: ProductMediaManagerProps) => {
  const { toast } = useToast();
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select images under 10MB",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onMediaChange({
          ...media,
          images: [...media.images, base64String]
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = media.images.filter((_, i) => i !== index);
    const newThumbnailIndex = index === media.thumbnailIndex 
      ? 0 
      : index < media.thumbnailIndex 
        ? media.thumbnailIndex - 1 
        : media.thumbnailIndex;
    
    onMediaChange({
      ...media,
      images: newImages,
      thumbnailIndex: Math.min(newThumbnailIndex, newImages.length - 1)
    });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...media.images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newImages.length) {
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      
      // Update thumbnail index if affected
      let newThumbnailIndex = media.thumbnailIndex;
      if (media.thumbnailIndex === index) {
        newThumbnailIndex = newIndex;
      } else if (media.thumbnailIndex === newIndex) {
        newThumbnailIndex = index;
      }
      
      onMediaChange({
        ...media,
        images: newImages,
        thumbnailIndex: newThumbnailIndex
      });
    }
  };

  const setAsThumbnail = (index: number) => {
    onMediaChange({
      ...media,
      thumbnailIndex: index
    });
  };

  const handleVideoAdd = () => {
    if (!newVideoUrl.trim()) return;

    // Basic URL validation
    const videoUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|.*\.(mp4|mov|webm|ogg)).*$/i;
    
    if (!videoUrlPattern.test(newVideoUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid video URL (YouTube, Vimeo, or direct video file)",
        variant: "destructive"
      });
      return;
    }

    onMediaChange({
      ...media,
      videos: [...media.videos, newVideoUrl.trim()]
    });

    setNewVideoUrl('');
    setIsVideoDialogOpen(false);
    
    toast({
      title: "Video added",
      description: "Video has been added to the product gallery"
    });
  };

  const removeVideo = (index: number) => {
    onMediaChange({
      ...media,
      videos: media.videos.filter((_, i) => i !== index)
    });
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isVimeoUrl = (url: string) => {
    return url.includes('vimeo.com');
  };

  const getVideoThumbnail = (url: string) => {
    if (isYouTubeUrl(url)) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      return videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : null;
    }
    if (isVimeoUrl(url)) {
      // For Vimeo, we'd need to make an API call to get thumbnail
      return null;
    }
    return null; // For direct video files, we can't easily get a thumbnail
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Product Media Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="images" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images ({media.images.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos ({media.videos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="space-y-4">
            {/* Image Upload */}
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Add Images
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <span className="text-sm text-muted-foreground">
                {media.images.length} image(s) • Max 10MB per image
              </span>
            </div>

            {/* Images Grid */}
            {media.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.images.map((image, index) => (
                  <div
                    key={index}
                    className={`relative group border-2 rounded-lg overflow-hidden ${
                      index === media.thumbnailIndex 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border'
                    }`}
                  >
                    <div className="aspect-square">
                      <img
                        src={image}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Thumbnail Badge */}
                    {index === media.thumbnailIndex && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Thumbnail
                        </Badge>
                      </div>
                    )}
                    
                    {/* Position Indicator */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    
                    {/* Image Controls */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {/* Set as Thumbnail */}
                      {index !== media.thumbnailIndex && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setAsThumbnail(index)}
                          className="h-7 w-7 p-0"
                          title="Set as thumbnail"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {/* Move Up */}
                      {index > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => moveImage(index, 'up')}
                          className="h-7 w-7 p-0"
                          title="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {/* Move Down */}
                      {index < media.images.length - 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => moveImage(index, 'down')}
                          className="h-7 w-7 p-0"
                          title="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {/* Remove */}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(index)}
                        className="h-7 w-7 p-0"
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {media.images.length === 0 && (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No images uploaded yet</p>
                <p className="text-sm text-muted-foreground/75">Click "Add Images" to upload product photos</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            {/* Video Upload */}
            <div className="flex items-center gap-4">
              <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Add Video
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Product Video</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="videoUrl">Video URL</Label>
                      <Input
                        id="videoUrl"
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/... or direct video file URL"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Supported: YouTube, Vimeo, or direct video files (MP4, MOV, WebM)
                      </p>
                    </div>
                    <Button onClick={handleVideoAdd} className="w-full">
                      Add Video
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <span className="text-sm text-muted-foreground">
                {media.videos.length} video(s)
              </span>
            </div>

            {/* Videos Grid */}
            {media.videos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {media.videos.map((video, index) => (
                  <div
                    key={index}
                    className="relative group border border-border rounded-lg overflow-hidden bg-muted"
                  >
                    <div className="aspect-video flex items-center justify-center">
                      {getVideoThumbnail(video) ? (
                        <img
                          src={getVideoThumbnail(video)!}
                          alt={`Video ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Video className="h-12 w-12 mb-2" />
                          <p className="text-sm">Video Preview</p>
                        </div>
                      )}
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/70 rounded-full p-3">
                          <Play className="h-6 w-6 text-white fill-current" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Video Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">
                        Video {index + 1}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isYouTubeUrl(video) && "YouTube"}
                        {isVimeoUrl(video) && "Vimeo"}
                        {!isYouTubeUrl(video) && !isVimeoUrl(video) && "Direct Video"}
                      </p>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeVideo(index)}
                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {media.videos.length === 0 && (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No videos uploaded yet</p>
                <p className="text-sm text-muted-foreground/75">Click "Add Video" to upload product videos</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProductMediaManager;