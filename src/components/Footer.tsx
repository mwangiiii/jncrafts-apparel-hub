import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";

const Footer = () => {
  const socialLinks = [
    { icon: <Instagram className="h-5 w-5" />, href: "#", label: "Instagram" },
    { icon: <Facebook className="h-5 w-5" />, href: "#", label: "Facebook" },
    { icon: <Twitter className="h-5 w-5" />, href: "#", label: "Twitter" },
    { icon: <Youtube className="h-5 w-5" />, href: "#", label: "YouTube" },
  ];

  const footerLinks = {
    Shop: ["All Products", "Tracksuits", "Hoodies", "Pants", "New Arrivals"],
    Support: ["Contact Us", "Size Guide", "Shipping Info", "Returns", "FAQ"],
    Company: ["About Us", "Careers", "Press", "Wholesale", "Sustainability"],
  };

  return (
    <footer className="bg-foreground text-background w-full">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold mb-4">
              jn<span className="text-brand-beige">CRAFTS</span>
            </h3>
            <p className="text-background/80 mb-6">
              Premium streetwear designed for the modern lifestyle. 
              Crafted with precision, styled with passion.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="text-background/60 hover:text-brand-beige transition-colors duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-lg mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link, index) => (
                  <li key={index}>
                    <a
                      href="#"
                      className="text-background/80 hover:text-brand-beige transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="text-center">
            <h4 className="text-xl font-semibold mb-2">Stay in the loop</h4>
            <p className="text-background/80 mb-6">
              Subscribe to get updates on new collections and exclusive offers.
            </p>
            <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-brand-beige min-w-0"
              />
              <button className="px-4 sm:px-6 py-2 bg-brand-beige text-brand-beige-foreground rounded-md hover:bg-brand-beige/90 transition-colors duration-300 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-background/20 mt-8 pt-8 text-center text-background/60">
          <p>&copy; 2024 jnCrafts. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;