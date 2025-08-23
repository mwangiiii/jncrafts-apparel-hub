import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, ExternalLink } from 'lucide-react';

interface ProductVideoPlayerProps {
  videos: string[];
  productName: string;
}

const ProductVideoPlayer = ({ videos, productName }: ProductVideoPlayerProps) => {
  if (!videos || videos.length === 0) return null;

  const getYouTubeEmbedUrl = (url: string): string | null => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  };

  const getVimeoEmbedUrl = (url: string): string | null => {
    const videoIdMatch = url.match(/vimeo\.com\/(\d+)/);
    return videoIdMatch ? `https://player.vimeo.com/video/${videoIdMatch[1]}` : null;
  };

  const isDirectVideoFile = (url: string): boolean => {
    return /\.(mp4|mov|webm|ogg)$/i.test(url);
  };

  const renderVideo = (videoUrl: string, index: number) => {
    const youtubeEmbedUrl = getYouTubeEmbedUrl(videoUrl);
    const vimeoEmbedUrl = getVimeoEmbedUrl(videoUrl);
    
    if (youtubeEmbedUrl) {
      return (
        <div key={index} className="relative">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe
              src={youtubeEmbedUrl}
              title={`${productName} - Video ${index + 1}`}
              className="w-full h-full"
              allowFullScreen
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <Badge variant="secondary" className="absolute top-2 right-2">
            YouTube
          </Badge>
        </div>
      );
    }
    
    if (vimeoEmbedUrl) {
      return (
        <div key={index} className="relative">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe
              src={vimeoEmbedUrl}
              title={`${productName} - Video ${index + 1}`}
              className="w-full h-full"
              allowFullScreen
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
            />
          </div>
          <Badge variant="secondary" className="absolute top-2 right-2">
            Vimeo
          </Badge>
        </div>
      );
    }
    
    if (isDirectVideoFile(videoUrl)) {
      return (
        <div key={index} className="relative">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <video
              controls
              className="w-full h-full object-cover"
              poster=""
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <Badge variant="secondary" className="absolute top-2 right-2">
            Video File
          </Badge>
        </div>
      );
    }
    
    // Fallback for unknown video types
    return (
      <Card key={index}>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <Play className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium mb-2">External Video</p>
              <p className="text-sm text-muted-foreground mb-4">
                This video is hosted externally. Click the link below to watch.
              </p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Watch Video
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Product Videos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((video, index) => renderVideo(video, index))}
        </div>
      </div>
    </div>
  );
};

export default ProductVideoPlayer;