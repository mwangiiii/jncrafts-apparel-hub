import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { validateContactForm, sanitizeContactForm, checkRateLimit } from "@/lib/security-utils";
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

const EnhancedContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    inquiryType: "",
    productId: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleProductSelect = (productId: string) => {
    setFormData(prev => ({ ...prev, productId, inquiryType: "product-inquiry" }));
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
  };

  const handleInquiryTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, inquiryType: value }));
    if (value !== "product-inquiry") {
      setSelectedProduct(null);
      setFormData(prev => ({ ...prev, productId: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit(`contact_${formData.email}`, 3, 300000)) {
      toast({
        title: "Too Many Requests",
        description: "Please wait before submitting another message.",
        variant: "destructive",
      });
      return;
    }
    
    // Sanitize form data
    const sanitizedData = sanitizeContactForm({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      subject: formData.subject,
      inquiryType: formData.inquiryType,
      message: formData.message
    });
    
    // Validate form data
    const validation = validateContactForm(sanitizedData);
    if (!validation.isValid) {
      toast({
        title: "Invalid Form Data",
        description: validation.errors.join('. '),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Include product information in message if selected
    let productInfo = "";
    if (selectedProduct) {
      productInfo = `\n\nProduct Inquiry Details:
Product: ${selectedProduct.name}
Category: ${selectedProduct.category}
Price: ${selectedProduct.price}`;
    }
    
    // Format message for both email and WhatsApp using sanitized data
    const formattedMessage = `Hello JN Crafts team, I would like to make an inquiry/order.

Name: ${sanitizedData.name}
Email: ${sanitizedData.email}
Phone: ${sanitizedData.phone}
${sanitizedData.inquiryType ? `Inquiry Type: ${sanitizedData.inquiryType}` : ''}
${sanitizedData.subject ? `Subject: ${sanitizedData.subject}` : ''}${productInfo}
Message: ${sanitizedData.message}

Looking forward to your response. Thank you!`;

    try {
      // Send email via edge function
      const emailResponse = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: sanitizedData.name,
          email: sanitizedData.email,
          phone: sanitizedData.phone,
          subject: sanitizedData.subject,
          inquiryType: sanitizedData.inquiryType,
          productId: formData.productId,
          message: sanitizedData.message
        }
      });

      if (emailResponse.error) {
        throw new Error('Failed to send email');
      }

      // Format WhatsApp message with proper encoding
      const whatsappMessage = encodeURIComponent(formattedMessage);
      const whatsappUrl = `https://wa.me/254710573084?text=${whatsappMessage}`;
      
      toast({
        title: "Message Sent Successfully!",
        description: "Opening WhatsApp to send additional copy...",
      });

      // Open WhatsApp after a brief delay
      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
      }, 1000);

      // Reset form
      setFormData({ 
        name: "", 
        email: "", 
        phone: "", 
        subject: "", 
        inquiryType: "", 
        productId: "",
        message: "" 
      });
      setSelectedProduct(null);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactInfo = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email",
      info: "craftsjn@gmail.com",
      description: "Send us an email anytime"
    },
    {
      icon: <Phone className="h-6 w-6" />,
      title: "Phone",
      info: "+254710573084",
      description: "Call us during business hours"
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Address",
      info: "Nairobi CBD, Kenya 00100",
      description: "Address"
    }
  ];

  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get in <span className="text-brand-beige">Touch</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions about our products or need assistance with your order? 
            We're here to help and would love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h3 className="text-2xl font-bold mb-8">Contact Information</h3>
            <div className="space-y-6">
              {contactInfo.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-brand-beige/10 text-brand-beige rounded-full flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{item.title}</h4>
                        <p className="text-foreground font-medium">{item.info}</p>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Business Hours */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monday - Friday:</span>
                    <span>9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday:</span>
                    <span>10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday:</span>
                    <span>Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send us a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+254712345678"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="inquiryType">Inquiry Type</Label>
                    <Select value={formData.inquiryType} onValueChange={handleInquiryTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inquiry type" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border border-border shadow-lg">
                        <SelectItem value="hoodies">Hoodies</SelectItem>
                        <SelectItem value="jackets">Jackets</SelectItem>
                        <SelectItem value="pants">Pants</SelectItem>
                        <SelectItem value="croptops">Croptops</SelectItem>
                        <SelectItem value="customized-tshirts">Customized Tshirts</SelectItem>
                        <SelectItem value="2-piece-set">2 Piece Set</SelectItem>
                        <SelectItem value="skull-caps">Skull Caps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Product Selection */}
                {formData.inquiryType === "product-inquiry" && (
                  <div>
                    <Label htmlFor="productId">Select Product</Label>
                    <Select value={formData.productId} onValueChange={handleProductSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${product.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selected Product Display */}
                {selectedProduct && (
                  <Card className="p-4 bg-muted/50">
                    <div className="flex items-start gap-4">
                      <img
                        src={selectedProduct.images[0] || '/placeholder.svg'}
                        alt={selectedProduct.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold">{selectedProduct.name}</h4>
                        <p className="text-sm text-muted-foreground">{selectedProduct.category}</p>
                        <p className="text-sm font-medium text-brand-beige">${selectedProduct.price}</p>
                        {selectedProduct.videos && selectedProduct.videos.length > 0 && (
                          <video
                            src={selectedProduct.videos[0]}
                            className="w-full max-w-32 h-20 object-cover rounded mt-2"
                            muted
                            controls
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                )}
                
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="What is this about?"
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help you..."
                    rows={5}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  variant="brand" 
                  size="lg" 
                  className="w-full"
                  disabled={isSubmitting}
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