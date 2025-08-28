import { useState, useEffect } from "react";
import { Users, Award, Truck, Shield, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';

// Import OptimizedImage with explicit path
import OptimizedImage from "./OptimizedImage";

interface AboutMedia {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  display_order: number;
  is_active: boolean;
}

const DynamicAboutSection = () => {
  const [aboutMedia, setAboutMedia] = useState<AboutMedia[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutMedia();
  }, []);

  // Auto-rotate media every 5 seconds
  useEffect(() => {
    if (aboutMedia.length <= 1 || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentMediaIndex((prev) => (prev + 1) % aboutMedia.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [aboutMedia.length, isPlaying]);

  const fetchAboutMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('about_media')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        media_type: item.media_type as 'image' | 'video'
      }));
      
      setAboutMedia(typedData);
    } catch (error) {
      console.error('Error fetching about media:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMedia = aboutMedia[currentMediaIndex];
  const hasMultipleMedia = aboutMedia.length > 1;

  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "Community Focused",
      description: "Building a community of fashion-forward individuals who appreciate quality streetwear."
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Premium Quality",
      description: "Every piece is crafted with attention to detail using high-quality materials."
    },
    {
      icon: <Truck className="h-8 w-8" />,
      title: "Fast Delivery",
      description: "Quick and reliable shipping to get your order to you as soon as possible."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Satisfaction Guarantee",
      description: "We stand behind our products with a 100% satisfaction guarantee."
    }
  ];

  return (
    <section id="about" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="text-brand-beige">jnCRAFTS</span>
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground">
              <p>
                jnCrafts is more than just a clothing brand - we're a lifestyle. Founded with 
                the vision of creating premium streetwear that combines comfort, style, and 
                durability, we've been crafting exceptional pieces for the modern individual.
              </p>
              <p>
                Our collection features carefully designed tracksuits, hoodies, and apparel 
                that reflect contemporary urban culture while maintaining the highest standards 
                of quality and craftsmanship.
              </p>
              <p>
                Every piece in our collection is a testament to our commitment to excellence, 
                from the initial design concept to the final stitch. We believe that great 
                style should be accessible, comfortable, and built to last.
              </p>
            </div>
          </div>

          {/* Dynamic Media Section */}
          <div className="relative">
            {loading ? (
              <div className="w-full h-[600px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
                <span className="text-muted-foreground">Loading media...</span>
              </div>
            ) : currentMedia ? (
              <div className="relative overflow-hidden rounded-lg shadow-2xl">
                {currentMedia.media_type === 'video' ? (
                  <video
                    key={currentMedia.id}
                    className="w-full h-[600px] object-cover transition-opacity duration-1000"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src={currentMedia.media_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img
                    key={currentMedia.id}
                    src={currentMedia.media_url}
                    alt="jnCrafts showcase"
                    className="w-full h-[600px] object-cover transition-opacity duration-1000"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-beige/20 to-transparent" />
                
                {/* Media Controls */}
                {hasMultipleMedia && (
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-background/80 backdrop-blur-sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                {/* Media Indicators */}
                {hasMultipleMedia && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {aboutMedia.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentMediaIndex 
                            ? 'bg-white shadow-lg' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                        onClick={() => setCurrentMediaIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <OptimizedImage
                src="/lovable-uploads/db868647-544e-4c56-9f4e-508500776671.png"
                alt="jnCrafts team wearing our products"
                className="w-full h-[600px] object-cover rounded-lg shadow-2xl"
                width={800}
                height={600}
                quality={85}
                lazy={true}
                progressive={true}
              />
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose jnCrafts?</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-beige/10 text-brand-beige rounded-full mb-4">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold mb-3">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DynamicAboutSection;