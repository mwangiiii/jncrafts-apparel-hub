import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Home, BarChart3, Package, MessageSquare, Settings, Shield, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const AdminHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const adminNavigation = [
    { name: "Dashboard", href: "/admin", icon: BarChart3 },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Messages", href: "/admin/messages", icon: MessageSquare },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-[100] w-full bg-gradient-to-r from-primary/95 to-primary-dark/95 backdrop-blur-sm border-b border-primary/20 shadow-lg">
      <div className="w-full max-w-none px-2 sm:px-4">
        <div className="flex items-center justify-between min-h-[64px] h-16">
          {/* Admin Logo - Responsive */}
          <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0 min-w-0">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-white truncate">
                  jn<span className="text-brand-beige">CRAFTS</span>
                </h1>
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30 hidden sm:inline-flex">
                  Admin Panel
                </Badge>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 xl:px-4 py-2 rounded-lg transition-all duration-300 ${
                    isActive 
                      ? "bg-white/20 text-white shadow-md" 
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm xl:text-base">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Menu and Navigation - Responsive */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Back to Main Site - Hidden on small screens, shown in mobile menu instead */}
            <Link to="/" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3">
                <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden md:inline">Main Site</span>
                <span className="md:hidden">Main</span>
              </Button>
            </Link>

            {/* Admin User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled>
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.email}</span>
                      <span className="text-xs text-muted-foreground">Administrator</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/products')}>
                    <Package className="mr-2 h-4 w-4" />
                    Manage Products
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/categories')}>
                    <Tags className="mr-2 h-4 w-4" />
                    Manage Categories
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/messages')}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Admin Messages
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    Return to Main Site
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
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

        {/* Mobile Navigation - Improved */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 bg-gradient-to-r from-primary/95 to-primary-dark/95">
            <nav className="py-3 space-y-1 px-2">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-3 mx-1 rounded-lg transition-colors duration-300 ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              <Link 
                to="/" 
                className="flex items-center space-x-3 px-3 py-3 mx-1 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-300 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-4 w-4" />
                <span className="font-medium">Main Site</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;