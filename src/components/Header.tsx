import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, User, Settings, LogOut, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CurrencySelector } from "./CurrencySelector";

interface HeaderProps {
  cartItems: number;
  onCartClick: () => void;
}

const Header = ({ cartItems, onCartClick }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const navigation = [
    { name: "Home", href: "#home" },
    { name: "Products", href: "#products" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="responsive-container">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo - Responsive sizing */}
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              jn<span className="text-brand-beige">CRAFTS</span>
            </h1>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex space-x-6 xl:space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm xl:text-base text-foreground hover:text-brand-beige transition-colors duration-300 touch-target"
              >
                {item.name}
              </a>
            ))}
            {isAdmin && (
              <Link 
                to="/admin" 
                className="text-sm xl:text-base text-foreground hover:text-brand-beige transition-colors duration-300 touch-target"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Right side controls - Mobile optimized */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Currency Selector - Hidden on small screens */}
            <div className="hidden sm:block">
              <CurrencySelector />
            </div>
            
            {/* Wishlist - Only show for logged in users */}
            {user && (
              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="touch-target tap-highlight">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Wishlist</span>
                </Button>
              </Link>
            )}
            
            {/* Cart Button - Touch optimized */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick}
              className="relative touch-target tap-highlight"
              aria-label={`Shopping cart with ${cartItems} items`}
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              {cartItems > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-brand-beige text-brand-beige-foreground text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium">
                  {cartItems > 99 ? '99+' : cartItems}
                </span>
              )}
            </Button>

            {/* User Menu/Auth Button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="touch-target tap-highlight">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background border-border shadow-lg">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/products')} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Products
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/messages')} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Messages
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/messages')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Messages
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="text-xs sm:text-sm px-2 sm:px-4 touch-target tap-highlight"
              >
                Sign In
              </Button>
            )}

            {/* Mobile menu toggle - Only visible on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden touch-target tap-highlight"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu - Responsive */}
        {isMobileMenuOpen && (
          <div className={`lg:hidden border-t border-border mobile-nav ${isMobileMenuOpen ? 'mobile-nav-enter' : 'mobile-nav-exit'}`}>
            <nav className="py-4 space-y-1 animate-fade-in">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-3 text-base text-foreground hover:text-brand-beige hover:bg-muted transition-colors duration-300 touch-target tap-highlight"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="block px-4 py-3 text-base text-foreground hover:text-brand-beige hover:bg-muted transition-colors duration-300 touch-target tap-highlight"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin Dashboard
                </Link>
              )}
              
              {/* Currency selector in mobile menu */}
              <div className="px-4 py-3 border-t border-border sm:hidden">
                <div className="text-sm font-medium text-muted-foreground mb-2">Currency</div>
                <CurrencySelector />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;