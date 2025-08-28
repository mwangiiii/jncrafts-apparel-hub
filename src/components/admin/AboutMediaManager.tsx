import { useState, useEffect } from "react";
import { Plus, Trash2, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

interface AboutMedia {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  display_order: number;
  is_active: boolean;
}

const AboutMediaManager = () => {
  const [mediaItems, setMediaItems] = useState<AboutMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMediaItems();
  }, []);

  const fetchMediaItems = async () => {
    try {
      const { data, error } = await supabase
        .from('about_media')
        .select('id, media_type, media_url, display_order, is_active, created_at, updated_at')
        .order('display_order', { ascending: true });

      if (error) throw error;
      const typedData = (data || []).map(item => ({
        ...item,
        media_type: item.media_type as 'image' | 'video'
      }));
      setMediaItems(typedData);
    } catch (error) {
      console.error('Error fetching media items:', error);
      toast({
        title: "Error",
        description: "Failed to load media items.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `about-media/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('about-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('about-media')
        .getPublicUrl(filePath);

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const displayOrder = mediaItems.length;

      const { error: insertError } = await supabase
        .from('about_media')
        .insert([{
          media_type: mediaType,
          media_url: publicUrl,
          display_order: displayOrder,
          is_active: true
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Media uploaded successfully.",
      });

      fetchMediaItems();
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: "Error",
        description: "Failed to upload media.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      const { error } = await supabase
        .from('about_media')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media deleted successfully.",
      });

      fetchMediaItems();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('about_media')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setMediaItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, is_active: isActive } : item
        )
      );

      toast({
        title: "Success",
        description: `Media ${isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      console.error('Error updating media:', error);
      toast({
        title: "Error",
        description: "Failed to update media.",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (id: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('about_media')
        .update({ display_order: newOrder })
        .eq('id', id);

      if (error) throw error;

      fetchMediaItems();
    } catch (error) {
      console.error('Error reordering media:', error);
      toast({
        title: "Error",
        description: "Failed to reorder media.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading about media...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          About Section Media Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <div className="space-y-4">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">Upload Media</h3>
              <p className="text-sm text-muted-foreground">
                Upload images or videos for the About section
              </p>
            </div>
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="w-full max-w-xs mx-auto"
            />
            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
          </div>
        </div>

        {/* Media List */}
        <div className="space-y-4">
          <h3 className="font-medium">Current Media ({mediaItems.length})</h3>
          {mediaItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No media items uploaded yet.
            </p>
          ) : (
            <div className="grid gap-4">
              {mediaItems.map((item) => (
                <Card key={item.id} className={`p-4 ${!item.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    {/* Media Preview */}
                    <div className="w-20 h-20 flex-shrink-0">
                      {item.media_type === 'video' ? (
                        <video
                          src={item.media_url}
                          className="w-full h-full object-cover rounded"
                          muted
                        />
                      ) : (
                        <img
                          src={item.media_url}
                          alt="Media preview"
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                    </div>

                    {/* Media Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {item.media_type}
                        </span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          Order: {item.display_order}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${item.id}`} className="text-sm">
                            Active
                          </Label>
                          <Switch
                            id={`active-${item.id}`}
                            checked={item.is_active}
                            onCheckedChange={(checked) => 
                              handleToggleActive(item.id, checked)
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`order-${item.id}`} className="text-sm">
                            Order:
                          </Label>
                          <Input
                            id={`order-${item.id}`}
                            type="number"
                            value={item.display_order}
                            onChange={(e) => 
                              handleReorder(item.id, parseInt(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(item.media_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMedia(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AboutMediaManager;