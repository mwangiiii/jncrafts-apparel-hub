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
      <div className="w-full max-w-none px-2 sm:px-4">
        <div className="flex items-center justify-between min-h-[64px] h-16">
          {/* Logo - Responsive */}
          <div className="flex-shrink-0">
            <Link to="/">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                jn<span className="text-brand-beige">CRAFTS</span>
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-6 xl:space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-foreground hover:text-brand-beige transition-colors duration-300 text-sm xl:text-base"
              >
                {item.name}
              </a>
            ))}
            {isAdmin && (
              <Link to="/admin" className="text-foreground hover:text-brand-beige transition-colors duration-300 text-sm xl:text-base">
                Admin
              </Link>
            )}
          </nav>

          {/* Right Side Controls - Responsive */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
            {/* Currency Selector - Hidden on very small screens */}
            <div className="hidden sm:block">
              <CurrencySelector />
            </div>
            
            {/* Wishlist - Only show for logged in users */}
            {user && (
              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            )}
            
            {/* Cart Button - Responsive */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick}
              className="relative h-8 w-8 sm:h-10 sm:w-10"
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              {cartItems > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-brand-beige text-brand-beige-foreground text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs font-medium">
                  {cartItems > 99 ? '99+' : cartItems}
                </span>
              )}
            </Button>

            {/* User Menu or Sign In */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/products')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Products
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/messages')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Messages
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/messages')}>
                      <User className="mr-2 h-4 w-4" />
                      My Messages
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')} className="text-xs sm:text-sm px-2 sm:px-4">
                Sign In
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation - Enhanced */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-sm">
            <nav className="py-3 space-y-1 px-2">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-3 rounded-lg text-foreground hover:text-brand-beige hover:bg-muted transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="block px-3 py-3 rounded-lg text-foreground hover:text-brand-beige hover:bg-muted transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              
              {/* Currency Selector in Mobile Menu */}
              <div className="sm:hidden px-3 py-3">
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