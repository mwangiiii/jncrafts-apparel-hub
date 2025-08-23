import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image - Responsive */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="jnCrafts streetwear collection showcasing premium urban fashion"
          className="responsive-hero-img"
          loading="eager"
          srcSet={`${heroImage} 1x`}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 sm:via-background/60 to-transparent"></div>
      </div>

      {/* Content - Mobile First Layout */}
      <div className="responsive-container relative z-10">
        <div className="max-w-full sm:max-w-2xl lg:max-w-3xl animate-fade-in-up">
          {/* Main Heading - Responsive Typography */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            jn<span className="text-brand-beige">CRAFTS</span>
          </h1>
          
          {/* Subheading - Responsive Text */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-prose">
            Premium streetwear designed for the modern lifestyle. Crafted with precision, 
            styled with passion.
          </p>
          
          {/* CTA Buttons - Mobile Optimized Layout */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button 
              variant="brand" 
              size="lg"
              asChild
              className="w-full sm:w-auto touch-target tap-highlight text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4"
            >
              <a href="#products" className="inline-flex items-center justify-center">
                Shop Collection
              </a>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              asChild
              className="w-full sm:w-auto touch-target tap-highlight text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 border-2 hover:bg-background/10"
            >
              <a href="#about" className="inline-flex items-center justify-center">
                Learn More
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator - Hidden on mobile, shown on larger screens */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-10 hidden sm:block">
        <div className="animate-bounce">
          <div className="w-5 h-8 sm:w-6 sm:h-10 border-2 border-foreground/70 rounded-full flex justify-center">
            <div className="w-1 h-2 sm:h-3 bg-foreground/70 rounded-full mt-2"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;