import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Upload, GripVertical } from 'lucide-react';

interface AboutMedia {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  display_order: number;
  is_active: boolean;
}

const AboutMediaManager = () => {
  const [aboutMedia, setAboutMedia] = useState<AboutMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAboutMedia();
  }, []);

  const fetchAboutMedia = async () => {
    const { data } = await supabase
      .from('about_media')
      .select('*')
      .order('display_order');
    
    if (data) {
      setAboutMedia(data as AboutMedia[]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('about-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('about-media')
        .getPublicUrl(filePath);

      const maxOrder = Math.max(...aboutMedia.map(m => m.display_order), 0);

      const { error: insertError } = await supabase
        .from('about_media')
        .insert({
          media_type: mediaType,
          media_url: publicUrl,
          display_order: maxOrder + 1,
          is_active: true
        });

      if (insertError) throw insertError;

      await fetchAboutMedia();
      toast({
        title: "Media uploaded successfully",
        description: `${mediaType} has been added to the about section`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const updateMediaOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase
      .from('about_media')
      .update({ display_order: newOrder })
      .eq('id', id);

    if (!error) {
      await fetchAboutMedia();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('about_media')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      await fetchAboutMedia();
    }
  };

  const deleteMedia = async (id: string, mediaUrl: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      // Extract file path from URL
      const urlParts = mediaUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage
        .from('about-media')
        .remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from('about_media')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAboutMedia();
      toast({
        title: "Media deleted",
        description: "The media has been removed from the about section"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>About Section Media Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="image-upload" className="block text-sm font-medium mb-2">
              Upload Image
            </label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'image')}
              disabled={uploading}
            />
          </div>
          <div>
            <label htmlFor="video-upload" className="block text-sm font-medium mb-2">
              Upload Video
            </label>
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={(e) => handleFileUpload(e, 'video')}
              disabled={uploading}
            />
          </div>
        </div>

        {uploading && (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
          </div>
        )}

        <div className="space-y-3">
          {aboutMedia.map((media, index) => (
            <Card key={media.id} className={`${!media.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  
                  <div className="flex-shrink-0">
                    {media.media_type === 'image' ? (
                      <img
                        src={media.media_url}
                        alt="About media"
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <video
                        src={media.media_url}
                        className="w-16 h-16 object-cover rounded"
                        muted
                      />
                    )}
                  </div>

                  <div className="flex-grow">
                    <p className="font-medium capitalize">{media.media_type}</p>
                    <p className="text-sm text-muted-foreground">Order: {media.display_order}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={media.display_order}
                      onChange={(e) => updateMediaOrder(media.id, parseInt(e.target.value))}
                      className="w-20"
                      min="0"
                    />
                    
                    <Button
                      variant={media.is_active ? "default" : "secondary"}
                      size="sm"
                      onClick={() => toggleActive(media.id, media.is_active)}
                    >
                      {media.is_active ? "Active" : "Inactive"}
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMedia(media.id, media.media_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {aboutMedia.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No media uploaded yet. Upload images or videos to customize your about section.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AboutMediaManager;