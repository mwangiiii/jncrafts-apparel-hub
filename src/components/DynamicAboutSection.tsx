import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AboutMedia {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  display_order: number;
}

const DynamicAboutSection = () => {
  const [aboutMedia, setAboutMedia] = useState<AboutMedia[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoRefs, setVideoRefs] = useState<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    const fetchAboutMedia = async () => {
      const { data } = await supabase
        .from('about_media')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (data) {
        setAboutMedia(data as AboutMedia[]);
      }
    };

    fetchAboutMedia();
  }, []);

  useEffect(() => {
    if (aboutMedia.length <= 1 || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % aboutMedia.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [aboutMedia.length, isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    const currentMedia = aboutMedia[currentIndex];
    if (currentMedia?.media_type === 'video') {
      const video = videoRefs[currentMedia.id];
      if (video) {
        if (isPlaying) {
          video.pause();
        } else {
          video.play();
        }
      }
    }
  };

  if (aboutMedia.length === 0) {
    return (
      <section id="about" className="py-16 bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              About jnCRAFTS
            </h2>
            <div className="max-w-3xl mx-auto">
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                jnCrafts represents the intersection of street culture and premium quality. 
                We believe that fashion is a form of self-expression, and every piece we create 
                tells a story of authenticity, creativity, and urban sophistication.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentMedia = aboutMedia[currentIndex];

  return (
    <section id="about" className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          {aboutMedia.map((media, index) => (
            <div
              key={media.id}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            >
              {media.media_type === 'image' ? (
                <img
                  src={media.media_url}
                  alt="About jnCrafts"
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              ) : (
                <video
                  ref={(el) => setVideoRefs(prev => ({ ...prev, [media.id]: el }))}
                  src={media.media_url}
                  className="w-full h-full object-cover"
                  autoPlay={index === currentIndex && isPlaying}
                  loop
                  muted
                  playsInline
                />
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      </div>

      <div className="relative z-10 flex items-center min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-brand-beige to-white bg-clip-text text-transparent">
                About jn
              </span>
              <span className="bg-gradient-to-r from-brand-beige to-accent bg-clip-text text-transparent">
                CRAFTS
              </span>
            </h2>
            <div className="space-y-6 text-lg md:text-xl text-gray-200 leading-relaxed">
              <p>
                jnCrafts represents the intersection of street culture and premium quality. 
                We believe that fashion is a form of self-expression, and every piece we create 
                tells a story of authenticity, creativity, and urban sophistication.
              </p>
              <p>
                From concept to creation, we pour our passion into every detail. Our designs 
                blend contemporary streetwear aesthetics with timeless craftsmanship, ensuring 
                that each piece not only looks exceptional but stands the test of time.
              </p>
              <p>
                Join us in redefining street fashion - where comfort meets style, and every 
                garment is a statement of individuality.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Media Controls */}
      {aboutMedia.length > 1 && (
        <div className="absolute bottom-6 right-6 flex items-center gap-4 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayPause}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <div className="flex gap-2">
            {aboutMedia.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default DynamicAboutSection;