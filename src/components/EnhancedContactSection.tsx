import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  images: string[];
  price: number;
}

const EnhancedContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    selectedProductId: ""
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, images, price')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setProducts(data);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.selectedProductId) {
      const product = products.find(p => p.id === formData.selectedProductId);
      setSelectedProduct(product || null);
      if (product) {
        setFormData(prev => ({
          ...prev,
          subject: `Inquiry about ${product.name}`
        }));
      }
    } else {
      setSelectedProduct(null);
    }
  }, [formData.selectedProductId, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const messageContent = selectedProduct 
        ? `Product Inquiry: ${selectedProduct.name}\nPrice: KES ${selectedProduct.price?.toLocaleString()}\n\nMessage:\n${formData.message}`
        : formData.message;

      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: messageContent,
          productInfo: selectedProduct ? {
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            image: selectedProduct.images?.[0]
          } : null
        }
      });

      if (error) throw error;

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you as soon as possible."
      });

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        selectedProductId: ""
      });
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 bg-gradient-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Get in Touch
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about our products or want to place a custom order? We'd love to hear from you.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-elegant">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Input
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Your Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div>
                  <Select
                    value={formData.selectedProductId}
                    onValueChange={(value) => setFormData({ ...formData, selectedProductId: value })}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select inquiry type or specific product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="custom">Custom Order Request</SelectItem>
                      <SelectItem value="shipping">Shipping Information</SelectItem>
                      <SelectItem value="returns">Returns & Exchanges</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          Inquiry about {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <Card className="bg-muted/30 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {selectedProduct.images?.[0] && (
                          <img
                            src={selectedProduct.images[0]}
                            alt={selectedProduct.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {selectedProduct.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            KES {selectedProduct.price?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <Input
                    placeholder="Subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="bg-background/50"
                  />
                </div>

                <div>
                  <Textarea
                    placeholder="Tell us more about your inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className="bg-background/50 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  size="lg"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default EnhancedContactSection;