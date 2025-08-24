import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Eye, Star } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AboutMediaManager from "@/components/admin/AboutMediaManager";
import FeaturedProductsManager from "@/components/admin/FeaturedProductsManager";
import NewArrivalsManager from "@/components/admin/NewArrivalsManager";

const AdminContentManager = () => {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Content Manager</h1>
          <p className="text-muted-foreground">
            Manage homepage content, featured products, and new arrival labels
          </p>
        </div>

        <Tabs defaultValue="new-arrivals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new-arrivals" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              New Arrivals
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Featured Products
            </TabsTrigger>
            <TabsTrigger value="about-media" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              About Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-arrivals">
            <NewArrivalsManager />
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedProductsManager />
          </TabsContent>

          <TabsContent value="about-media">
            <AboutMediaManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminContentManager;