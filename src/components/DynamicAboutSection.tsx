import { useState, useEffect } from "react";
import { Users, Award, Truck, Shield, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Import OptimizedImage with explicit path
import OptimizedImage from "./OptimizedImage";

interface AboutMedia {
  id: string;
  media_url: string;
  alt_text: string;
  display_order: number;
}

const DynamicAboutSection = () => {
  // Static media array with all the jnCrafts images
  const aboutMedia: AboutMedia[] = [
    {
      id: "1",
      media_url: "/lovable-uploads/7b4c907d-e2b7-46a2-bbde-20cb4abc0776.png",
      alt_text: "jnCRAFTS beige tracksuit back view - premium streetwear collection",
      display_order: 1
    },
    {
      id: "2", 
      media_url: "/lovable-uploads/131ae0e9-2be0-4978-844b-c5b068698fc5.png",
      alt_text: "jnCRAFTS beige tracksuit front view showcasing modern urban style",
      display_order: 2
    },
    {
      id: "3",
      media_url: "/lovable-uploads/896feeaf-efd1-44cf-9633-234eca0ec7b0.png", 
      alt_text: "jnCRAFTS duo outdoor photoshoot - black and beige streetwear collection",
      display_order: 3
    },
    {
      id: "4",
      media_url: "/lovable-uploads/f661576c-022f-427d-a121-e9c27a96720f.png",
      alt_text: "jnCRAFTS black tracksuit pose - premium urban fashion",
      display_order: 4
    },
    {
      id: "5", 
      media_url: "/lovable-uploads/e8aae9e2-1dcc-449a-b973-a146c9f76697.png",
      alt_text: "jnCRAFTS duo pose - black and beige streetwear collaboration",
      display_order: 5
    },
    {
      id: "6",
      media_url: "/lovable-uploads/aa402c42-c440-4464-8001-285730a3aab2.png",
      alt_text: "jnCRAFTS reflective tracksuit in modern hallway setting",
      display_order: 6
    },
    {
      id: "7",
      media_url: "/lovable-uploads/bf0a3d25-068b-4216-a267-c3b20fb91e09.png", 
      alt_text: "jnCRAFTS women's black tracksuit - contemporary streetwear design",
      display_order: 7
    },
    {
      id: "8",
      media_url: "/lovable-uploads/a01150bb-2ae7-49ef-8e2b-97e0937143f1.png",
      alt_text: "jnCRAFTS women's crop top and joggers - urban fashion statement",
      display_order: 8
    },
    {
      id: "9",
      media_url: "/lovable-uploads/18c44d09-ee17-43a6-9ed7-fc230cf18b77.png",
      alt_text: "jnCRAFTS women's t-shirt by train - street style photography",
      display_order: 9
    },
    {
      id: "10",
      media_url: "/lovable-uploads/27421a78-37c1-421c-ad08-d6a696faa860.png",
      alt_text: "jnCRAFTS two women in matching t-shirts - brand community showcase",
      display_order: 10
    }
  ];

  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextImageIndex, setNextImageIndex] = useState(1);

  // Auto-rotate media every 4 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      handleNextImage();
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying, currentMediaIndex]);

  const handleNextImage = () => {
    const nextIndex = (currentMediaIndex + 1) % aboutMedia.length;
    setNextImageIndex(nextIndex);
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentMediaIndex(nextIndex);
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrevImage = () => {
    const prevIndex = (currentMediaIndex - 1 + aboutMedia.length) % aboutMedia.length;
    setNextImageIndex(prevIndex);
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentMediaIndex(prevIndex);
      setIsTransitioning(false);
    }, 300);
  };

  const handleDotClick = (index: number) => {
    if (index !== currentMediaIndex) {
      setNextImageIndex(index);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentMediaIndex(index);
        setIsTransitioning(false);
      }, 300);
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
    <section id="about" className="py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="text-brand-beige">jnCRAFTS</span>
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground">
              <p className="leading-relaxed">
                jnCrafts is more than just a clothing brand - we're a lifestyle. Founded with 
                the vision of creating premium streetwear that combines comfort, style, and 
                durability, we've been crafting exceptional pieces for the modern individual.
              </p>
              <p className="leading-relaxed">
                Our collection features carefully designed tracksuits, hoodies, and apparel 
                that reflect contemporary urban culture while maintaining the highest standards 
                of quality and craftsmanship.
              </p>
              <p className="leading-relaxed">
                Every piece in our collection is a testament to our commitment to excellence, 
                from the initial design concept to the final stitch. We believe that great 
                style should be accessible, comfortable, and built to last.
              </p>
            </div>
          </div>

          {/* Dynamic Media Section */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl group bg-gradient-to-br from-muted/50 to-background">
              {/* Main Image Container with smooth transitions */}
              <div className="relative w-full h-[600px]">
                {/* Current Image */}
                <div 
                  className={`absolute inset-0 transition-all duration-500 ease-out transform ${
                    isTransitioning 
                      ? 'opacity-0 scale-95 translate-x-8' 
                      : 'opacity-100 scale-100 translate-x-0'
                  }`}
                >
                  <img
                    key={`current-${currentMedia.id}`}
                    src={currentMedia.media_url}
                    alt={currentMedia.alt_text}
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                  />
                </div>

                {/* Next Image for smooth transitions */}
                {isTransitioning && (
                  <div 
                    className={`absolute inset-0 transition-all duration-500 ease-out transform ${
                      isTransitioning 
                        ? 'opacity-100 scale-100 translate-x-0' 
                        : 'opacity-0 scale-95 -translate-x-8'
                    }`}
                  >
                    <img
                      key={`next-${aboutMedia[nextImageIndex]?.id}`}
                      src={aboutMedia[nextImageIndex]?.media_url}
                      alt={aboutMedia[nextImageIndex]?.alt_text}
                      className="w-full h-full object-cover object-center"
                      loading="eager"
                    />
                  </div>
                )}
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-beige/10 via-transparent to-transparent" />
              
              {/* Navigation Arrows */}
              {hasMultipleMedia && (
                <>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-md border-white/20 text-foreground hover:bg-background hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
                    onClick={handlePrevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-md border-white/20 text-foreground hover:bg-background hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Play/Pause Control */}
              {hasMultipleMedia && (
                <div className="absolute top-4 right-4">
                  <Button
                    size="icon"
                    variant="outline"
                    className="bg-background/90 backdrop-blur-md border-white/20 hover:bg-background hover:scale-110 transition-all duration-300 shadow-lg"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              )}

              {/* Image Counter */}
              {hasMultipleMedia && (
                <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md rounded-full px-4 py-2 text-sm font-medium shadow-lg border border-white/20">
                  {currentMediaIndex + 1} / {aboutMedia.length}
                </div>
              )}

              {/* Dot Indicators */}
              {hasMultipleMedia && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
                  {aboutMedia.map((_, index) => (
                    <button
                      key={index}
                      className={`transition-all duration-300 hover:scale-125 rounded-full ${
                        index === currentMediaIndex 
                          ? 'w-10 h-3 bg-white shadow-lg' 
                          : 'w-3 h-3 bg-white/60 hover:bg-white/80'
                      }`}
                      onClick={() => handleDotClick(index)}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24">
          <h3 className="text-3xl font-bold text-center mb-12 animate-fade-in">
            Why Choose jnCrafts?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-muted/50 hover:border-brand-beige/30 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-beige/10 text-brand-beige rounded-full mb-6 group-hover:scale-110 group-hover:bg-brand-beige/20 transition-all duration-300 group-hover:shadow-lg">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold mb-4 group-hover:text-brand-beige transition-colors duration-300">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
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