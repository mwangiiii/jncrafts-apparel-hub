import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/OptimizedImage";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <OptimizedImage
          src="/lovable-uploads/7957bb4c-c1c7-4adb-9854-974dfbd9f332.png"
          alt="jnCrafts streetwear models showcasing premium hoodies"
          className="w-full h-full object-cover object-center"
          width={1920}
          height={1080}
          quality={90}
          lazy={false}
          progressive={true}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-white via-brand-beige to-white bg-clip-text text-transparent drop-shadow-2xl">
            jn<span className="bg-gradient-to-r from-brand-beige to-accent bg-clip-text text-transparent">CRAFTS</span>
          </h1>
          <p className="text-xl md:text-2xl bg-gradient-to-r from-white/90 to-brand-beige/80 bg-clip-text text-transparent mb-8 leading-relaxed drop-shadow-lg">
            Premium streetwear designed for the modern lifestyle. Crafted with precision, 
            styled with passion.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="brand" size="xl" asChild>
              <a href="#products">Shop Collection</a>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <a href="#about">Learn More</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="animate-bounce">
          <div className="w-6 h-10 border-2 border-foreground rounded-full flex justify-center">
            <div className="w-1 h-3 bg-foreground rounded-full mt-2"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;