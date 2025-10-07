import { Instagram, Facebook, Twitter, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const socialLinks = [
    { icon: <Instagram className="h-5 w-5" />, href: "https://instagram.com/jncrafts", label: "Instagram" },
    { icon: <Facebook className="h-5 w-5" />, href: "https://facebook.com/jncrafts", label: "Facebook" },
    { icon: <Twitter className="h-5 w-5" />, href: "https://twitter.com/jncrafts", label: "Twitter" },
    { icon: <Youtube className="h-5 w-5" />, href: "https://youtube.com/jncrafts", label: "YouTube" },
  ];

  return (
    <footer className="bg-foreground text-background w-full">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-brand-beige">JNCRAFTS</span>
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
          <div>
            <h4 className="font-semibold text-lg mb-4">Shop</h4>
            <ul className="space-y-2">
              <li><Link to="/#products" className="text-background/80 hover:text-brand-beige transition-colors duration-300">All Products</Link></li>
              <li><Link to="/#products" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Hoodies</Link></li>
              <li><Link to="/#products" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Jackets</Link></li>
              <li><Link to="/#products" className="text-background/80 hover:text-brand-beige transition-colors duration-300">T-Shirts</Link></li>
              <li><Link to="/#products" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Accessories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/#contact" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Contact Us</Link></li>
              <li><a href="tel:+1234567890" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Call Support</a></li>
              <li><a href="mailto:support@jncrafts.com" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Email Support</a></li>
              <li><Link to="/auth" className="text-background/80 hover:text-brand-beige transition-colors duration-300">My Account</Link></li>
              <li><Link to="/wishlist" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/#about" className="text-background/80 hover:text-brand-beige transition-colors duration-300">About Us</Link></li>
              <li><Link to="/#contact" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Contact</Link></li>
              <li><a href="#" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Privacy Policy</a></li>
              <li><a href="#" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Terms of Service</a></li>
              <li><a href="#" className="text-background/80 hover:text-brand-beige transition-colors duration-300">Shipping Info</a></li>
            </ul>
          </div>
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

        {/* Developer Contact Section */}
        <div className="border-t border-background/20 mt-8 pt-8">
          <div className="bg-background/5 rounded-lg p-6 text-center">
            <p className="text-background/90 mb-4">
              ✨ <span className="font-semibold">Interested in a similar system?</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:mwangiwanjiku033@gmail.com"
                className="flex items-center gap-2 text-background/80 hover:text-brand-beige transition-colors group"
              >
                <Mail className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>mwangiwanjiku033@gmail.com</span>
              </a>
              <span className="hidden sm:inline text-background/40">|</span>
              <a
                href="https://wa.me/254743614394"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-background/80 hover:text-[#25D366] transition-colors group"
              >
                <Phone className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>WhatsApp: +254 743 614 394</span>
              </a>
            </div>
            <p className="text-background/60 text-sm mt-3">
              Custom web solutions tailored to your business needs
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-background/20 mt-8 pt-8 text-center text-background/60">
          <p>&copy; 2024 JNCRAFTS. All rights reserved. | <a href="#" className="hover:text-brand-beige transition-colors">Privacy Policy</a> | <a href="#" className="hover:text-brand-beige transition-colors">Terms of Service</a></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;