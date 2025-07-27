import { Users, Award, Truck, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const AboutSection = () => {
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

          {/* Image */}
          <div className="relative">
            <img
              src="/lovable-uploads/db868647-544e-4c56-9f4e-508500776671.png"
              alt="jnCrafts team wearing our products"
              className="w-full h-[600px] object-cover rounded-lg shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-beige/20 to-transparent rounded-lg" />
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

export default AboutSection;