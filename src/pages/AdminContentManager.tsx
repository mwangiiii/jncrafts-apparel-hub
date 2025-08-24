import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminHeader from "@/components/AdminHeader";
import AboutMediaManager from "@/components/admin/AboutMediaManager";
import FeaturedProductsManager from "@/components/admin/FeaturedProductsManager";
import NewArrivalsManager from "@/components/admin/NewArrivalsManager";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AdminContentManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (data?.role !== 'admin') {
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminStatus();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Content & Media Manager</h1>
          <p className="text-muted-foreground mt-2">
            Manage homepage content, featured products, and dynamic media
          </p>
        </div>

        <Tabs defaultValue="about-media" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about-media">About Section</TabsTrigger>
            <TabsTrigger value="featured-products">Featured Products</TabsTrigger>
            <TabsTrigger value="new-arrivals">New Arrivals</TabsTrigger>
          </TabsList>

          <TabsContent value="about-media" className="space-y-6">
            <AboutMediaManager />
          </TabsContent>

          <TabsContent value="featured-products" className="space-y-6">
            <FeaturedProductsManager />
          </TabsContent>

          <TabsContent value="new-arrivals" className="space-y-6">
            <NewArrivalsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminContentManager;