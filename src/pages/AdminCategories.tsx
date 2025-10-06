import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminHeader from "@/components/AdminHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryForm {
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CategoryForm>({
    name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (user && isAdmin) {
      fetchCategories();
    }
  }, [user, isAdmin]);

  const fetchCategories = async () => {
    try {
      setRefreshing(true);
      console.log('🔍 FETCHING CATEGORIES - ADMIN CHECK:', { user: !!user, isAdmin });

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.error('❌ CATEGORY FETCH ERROR:', error);
        throw error;
      }
      
      console.log('✅ CATEGORIES FETCHED SUCCESSFULLY:', data?.length || 0);
      setCategories(data || []);
    } catch (error: any) {
      console.error("🚨 Error fetching categories:", error);
      toast({
        title: "Error",
        description: `Failed to fetch categories: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update(formData)
          .eq("id", editingId)
          .select(); // Return updated row for refresh

        if (error) throw error;
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        // Create new category
        const { data: newCategory, error } = await supabase
          .from("categories")
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      resetForm();
      await fetchCategories(); // Refresh after success
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save category",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      await fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      display_order: categories.length,
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Category status updated",
      });
      await fetchCategories();
    } catch (error: any) {
      console.error("Error updating category status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update category status",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    await fetchCategories();
    toast({
      title: "Refreshed",
      description: "Categories updated",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Card>
              <CardHeader className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Header */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">Category Management</h1>
              <p className="text-primary-foreground/90">Organize and manage product categories for seamless navigation</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/20 text-primary-foreground hover:bg-white/30"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Edit Category" : "Add New Category"}</DialogTitle>
                    <DialogDescription>
                      Enter category details. Display order controls sorting in the storefront.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Men's Apparel"
                        required
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description for the category..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="display_order">Display Order</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={formData.display_order}
                          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                          min="0"
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Active
                          <Badge variant={formData.is_active ? "default" : "secondary"} className="text-xs">
                            {formData.is_active ? "Visible" : "Hidden"}
                          </Badge>
                        </Label>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        aria-label="Cancel category form"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button type="submit" aria-label={editingId ? "Update category" : "Create category"}>
                        <Save className="h-4 w-4 mr-2" />
                        {editingId ? "Update" : "Create"} Category
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Categories Table/Card Hybrid */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              All Categories ({categories.length})
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {categories.filter(c => c.is_active).length} Active
            </Badge>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No Categories Yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Add your first category to organize products.</p>
                <Button onClick={() => setShowForm(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Get Started
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile: Cards */}
                <div className="block sm:hidden space-y-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate pr-4">{category.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Order: {category.display_order}
                            </p>
                            {category.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {category.description}
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={() => toggleStatus(category.id, category.is_active)}
                            aria-label={`Toggle ${category.name} active status`}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Badge variant={category.is_active ? "default" : "secondary"} className="text-xs">
                              {category.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(category.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Dialog open={showForm && editingId === category.id} onOpenChange={(open) => {
                              if (!open) resetForm();
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(category)}
                                  aria-label={`Edit ${category.name}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingId(category.id);
                                if (confirm(`Delete "${category.name}"? This cannot be undone.`)) {
                                  handleDelete(category.id);
                                }
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              aria-label={`Delete ${category.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop: Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-1/4">Name</TableHead>
                        <TableHead className="w-2/5 hidden md:table-cell">Description</TableHead>
                        <TableHead className="w-1/12 text-center">Order</TableHead>
                        <TableHead className="w-1/6 text-center">Status</TableHead>
                        <TableHead className="w-1/6 hidden lg:table-cell text-center">Created</TableHead>
                        <TableHead className="w-1/6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="hidden md:table-cell max-w-md">
                            {category.description ? (
                              <p className="line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
                            ) : (
                              <span className="text-xs text-muted-foreground/70 italic">No description</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">{category.display_order}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={category.is_active}
                                onCheckedChange={() => toggleStatus(category.id, category.is_active)}
                                aria-label={`Toggle ${category.name} active status`}
                              />
                              <Badge 
                                variant={category.is_active ? "default" : "secondary"} 
                                className="hidden lg:inline-flex text-xs px-2 py-0.5"
                              >
                                {category.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-center text-sm text-muted-foreground">
                            {new Date(category.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Dialog open={showForm && editingId === category.id} onOpenChange={(open) => {
                                if (!open) resetForm();
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(category)}
                                    aria-label={`Edit ${category.name}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeletingId(category.id);
                                  if (confirm(`Delete "${category.name}"? This cannot be undone.`)) {
                                    handleDelete(category.id);
                                  }
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                aria-label={`Delete ${category.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCategories;