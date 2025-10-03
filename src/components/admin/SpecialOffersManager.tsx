import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Eye, EyeOff, Settings, Tag, Calendar, Users, Package, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Discount {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  banner_message: string | null;
  applies_to: 'all' | 'specific' | 'category';
  requires_code: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  category: { id: string; name: string };
  price: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface DiscountFormData {
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_order_amount: string;
  max_uses: string;
  banner_message: string;
  applies_to: 'all' | 'specific' | 'category';
  requires_code: boolean;
  code: string;
  start_date: string;
  end_date: string;
  selectedProducts: string[];
  selectedCategories: string[];
}

const SpecialOffersManager = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(true);
  const [sectionTitle, setSectionTitle] = useState('🔥 Special Offers');
  const [sectionSubtitle, setSectionSubtitle] = useState("Don't miss out on our limited-time deals and exclusive discounts");
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<DiscountFormData>({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '0',
    max_uses: '',
    banner_message: '',
    applies_to: 'all',
    requires_code: true,
    code: '',
    start_date: '',
    end_date: '',
    selectedProducts: [],
    selectedCategories: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDiscounts(),
      fetchProductsAndCategories(),
      fetchSettings()
    ]);
    setLoading(false);
  };

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select(`
          id, code, name, description, discount_type, discount_value, 
          min_order_amount, max_uses, used_count, banner_message, 
          applies_to, requires_code, is_active, start_date, end_date, created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts((data || []) as Discount[]);
    } catch (error: any) {
      console.error('Error fetching discounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch discounts",
        variant: "destructive",
      });
    }
  };

  const fetchProductsAndCategories = async () => {
    try {
      // Fetch products with categories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, price, is_active,
          category!inner(id, name)
        `)
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      setProducts(productsData || []);

      // Extract unique categories
      const uniqueCategories = Array.from(new Set(productsData?.map((p: Product) => p.category.name).filter(Boolean))) as string[];
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .in('name', uniqueCategories);
      setCategories(categoriesData || []);
    } catch (error: any) {
      console.error('Error fetching products/categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products and categories",
        variant: "destructive",
      });
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['special_offers_visible', 'special_offers_title', 'special_offers_subtitle']);

      if (error) throw error;
      
      const settingsMap = (data || []).reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      setSectionVisible(settingsMap.special_offers_visible === 'true' || settingsMap.special_offers_visible === true);
      setSectionTitle(settingsMap.special_offers_title || '🔥 Special Offers');
      setSectionSubtitle(settingsMap.special_offers_subtitle || "Don't miss out on our limited-time deals and exclusive discounts");
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
      
      toast({
        title: "Settings Updated",
        description: "Section settings saved successfully.",
      });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    }
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '0',
      max_uses: '',
      banner_message: '',
      applies_to: 'all',
      requires_code: true,
      code: '',
      start_date: '',
      end_date: '',
      selectedProducts: [],
      selectedCategories: []
    });
    setEditingDiscount(null);
  };

  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description || '',
      discount_type: discount.discount_type,
      discount_value: discount.discount_value.toString(),
      min_order_amount: discount.min_order_amount.toString(),
      max_uses: discount.max_uses?.toString() || '',
      banner_message: discount.banner_message || '',
      applies_to: discount.applies_to,
      requires_code: discount.requires_code,
      code: discount.code,
      start_date: discount.start_date ? new Date(discount.start_date).toISOString().slice(0, 16) : '',
      end_date: discount.end_date ? new Date(discount.end_date).toISOString().slice(0, 16) : '',
      selectedProducts: [],
      selectedCategories: []
    });
    setIsDiscountDialogOpen(true);
  };

  const handleSubmitDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.discount_value) {
      toast({
        title: "Error",
        description: "Name and discount value are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const discountData = {
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        banner_message: formData.banner_message || null,
        applies_to: formData.applies_to,
        requires_code: formData.requires_code,
        code: formData.requires_code ? formData.code : null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        is_active: true // Default active
      };

      let discountId: string;

      if (editingDiscount) {
        const { error } = await supabase
          .from('discounts')
          .update(discountData)
          .eq('id', editingDiscount.id);

        if (error) throw error;
        discountId = editingDiscount.id;
      } else {
        const { data, error } = await supabase
          .from('discounts')
          .insert(discountData)
          .select()
          .single();

        if (error) throw error;
        discountId = data.id;
      }

      // Clear and insert associations based on applies_to
      if (formData.applies_to === 'specific' && formData.selectedProducts.length > 0) {
        // Delete existing
        await supabase.from('discount_products').delete().eq('discount_id', discountId);
        // Insert new
        const productAssociations = formData.selectedProducts.map(productId => ({
          discount_id: discountId,
          product_id: productId
        }));
        const { error: assocError } = await supabase.from('discount_products').insert(productAssociations);
        if (assocError) throw assocError;
      } else if (formData.applies_to === 'category' && formData.selectedCategories.length > 0) {
        // Delete existing
        await supabase.from('discount_categories').delete().eq('discount_id', discountId);
        // Insert new
        const categoryAssociations = formData.selectedCategories.map(categoryId => ({
          discount_id: discountId,
          category_id: categoryId
        }));
        const { error: assocError } = await supabase.from('discount_categories').insert(categoryAssociations);
        if (assocError) throw assocError;
      }

      toast({
        title: "Success",
        description: editingDiscount ? "Offer updated" : "Offer created",
      });
      setIsDiscountDialogOpen(false);
      resetForm();
      await fetchDiscounts();
    } catch (error: any) {
      console.error('Error saving discount:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save offer",
        variant: "destructive"
      });
    }
  };

  const toggleDiscountStatus = async (discount: Discount) => {
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ is_active: !discount.is_active })
        .eq('id', discount.id);

      if (error) throw error;

      await fetchDiscounts();
      toast({
        title: "Success",
        description: `Offer ${!discount.is_active ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('Error toggling discount status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const deleteDiscount = async (discountId: string, discountName: string) => {
    try {
      // Clear associations first
      await supabase.from('discount_products').delete().eq('discount_id', discountId);
      await supabase.from('discount_categories').delete().eq('discount_id', discountId);

      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', discountId);

      if (error) throw error;

      await fetchDiscounts();
      toast({
        title: "Success",
        description: `"${discountName}" deleted`,
      });
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Offers updated",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <Card>
          <CardHeader className="p-6">
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDiscountDisplay = (discount: Discount) => {
    const type = discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `KES ${discount.discount_value}`;
    const uses = discount.max_uses ? `${discount.used_count}/${discount.max_uses}` : `${discount.used_count}+`;
    const expires = discount.end_date ? new Date(discount.end_date).toLocaleDateString() : 'No expiry';
    return `${type} • ${uses} uses • Expires ${expires}`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="offers" className="data-[state=active]:shadow-md">Offers ({discounts.length})</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:shadow-md">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Special Offers
                </CardTitle>
                <CardDescription>Create targeted promotions to boost sales</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh offers"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                  Refresh
                </Button>
                <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Offer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingDiscount ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
                      <DialogDescription>Configure discount details and targeting.</DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmitDiscount} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Offer Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Summer Sale 25%"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner_message">Banner Message</Label>
                          <Input
                            id="banner_message"
                            value={formData.banner_message}
                            onChange={(e) => setFormData(prev => ({ ...prev, banner_message: e.target.value }))}
                            placeholder="e.g., LIMITED TIME!"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Briefly describe the offer..."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="discount_type">Type</Label>
                          <Select
                            value={formData.discount_type}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value as 'percentage' | 'fixed' }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage Off</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="discount_value">Value *</Label>
                          <Input
                            id="discount_value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.discount_value}
                            onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                            placeholder={formData.discount_type === 'percentage' ? "25" : "500"}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="min_order_amount">Min Order (KES)</Label>
                          <Input
                            id="min_order_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.min_order_amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="applies_to">Applies To</Label>
                          <Select
                            value={formData.applies_to}
                            onValueChange={(value) => {
                              setFormData(prev => ({ 
                                ...prev, 
                                applies_to: value as 'all' | 'specific' | 'category',
                                selectedProducts: [],
                                selectedCategories: []
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Products</SelectItem>
                              <SelectItem value="specific">Specific Products</SelectItem>
                              <SelectItem value="category">Categories</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max_uses">Max Uses</Label>
                          <Input
                            id="max_uses"
                            type="number"
                            min="1"
                            value={formData.max_uses}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value }))}
                            placeholder="Unlimited"
                          />
                        </div>
                      </div>

                      {formData.applies_to === 'specific' && (
                        <div className="space-y-2">
                          <Label>Select Products</Label>
                          <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                            {products.map((product) => (
                              <div key={product.id} className="flex items-center space-x-2 p-1 rounded hover:bg-muted">
                                <Checkbox
                                  id={`product-${product.id}`}
                                  checked={formData.selectedProducts.includes(product.id)}
                                  onCheckedChange={(checked) => setFormData(prev => ({
                                    ...prev,
                                    selectedProducts: checked 
                                      ? [...prev.selectedProducts, product.id] 
                                      : prev.selectedProducts.filter(id => id !== product.id)
                                  }))}
                                />
                                <Label htmlFor={`product-${product.id}`} className="text-sm cursor-pointer flex-1">
                                  {product.name} <Badge variant="secondary" className="ml-2 text-xs">KES {product.price}</Badge>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.applies_to === 'category' && (
                        <div className="space-y-2">
                          <Label>Select Categories</Label>
                          <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                            {categories.map((category) => (
                              <div key={category.id} className="flex items-center space-x-2 p-1 rounded hover:bg-muted">
                                <Checkbox
                                  id={`category-${category.id}`}
                                  checked={formData.selectedCategories.includes(category.id)}
                                  onCheckedChange={(checked) => setFormData(prev => ({
                                    ...prev,
                                    selectedCategories: checked 
                                      ? [...prev.selectedCategories, category.id] 
                                      : prev.selectedCategories.filter(id => id !== category.id)
                                  }))}
                                />
                                <Label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer capitalize">
                                  {category.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-4 border-t">
                        <Checkbox
                          id="requires_code"
                          checked={formData.requires_code}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              requires_code: !!checked,
                              code: checked ? prev.code || '' : ''
                            }));
                          }}
                        />
                        <Label htmlFor="requires_code" className="text-sm font-medium">Require Promo Code</Label>
                      </div>

                      {formData.requires_code && (
                        <div className="space-y-2">
                          <Label htmlFor="code">Promo Code *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="code"
                              value={formData.code}
                              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              placeholder="e.g., SUMMER25"
                              required
                            />
                            <Button type="button" variant="outline" onClick={generatePromoCode} size="sm">
                              Generate
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="start_date">Start Date</Label>
                          <Input
                            id="start_date"
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end_date">End Date</Label>
                          <Input
                            id="end_date"
                            type="datetime-local"
                            value={formData.end_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      <DialogFooter className="gap-3 pt-6">
                        <Button type="button" variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={!formData.name || !formData.discount_value}>
                          {editingDiscount ? 'Update Offer' : 'Create Offer'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {discounts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Offers Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">Create your first special offer to attract customers.</p>
                  <Button onClick={() => setIsDiscountDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Offer
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {discounts.map((discount) => (
                    <Card key={discount.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <h3 className="font-semibold text-lg flex-1">{discount.name}</h3>
                            <Badge variant={discount.is_active ? "default" : "secondary"}>
                              {discount.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {discount.banner_message && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                {discount.banner_message}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{discount.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium">
                              {discount.discount_type === 'percentage' 
                                ? `${discount.discount_value}% Off` 
                                : `KES ${discount.discount_value} Off`
                              }
                            </span>
                            {discount.min_order_amount > 0 && (
                              <span>Min: KES {discount.min_order_amount}</span>
                            )}
                            <span>Used: {discount.used_count} {discount.max_uses ? `/ ${discount.max_uses}` : '(Unlimited)'}</span>
                            {discount.end_date && (
                              <Badge variant="secondary" className="text-xs">
                                Ends {new Date(discount.end_date).toLocaleDateString()}
                              </Badge>
                            )}
                            {discount.requires_code && (
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                {discount.code}
                              </code>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDiscountStatus(discount)}
                            aria-label={`Toggle ${discount.name} status`}
                          >
                            {discount.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(discount)}
                            aria-label={`Edit ${discount.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDiscount(discount.id, discount.name)}
                            className="text-destructive hover:text-destructive"
                            aria-label={`Delete ${discount.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Section Settings
              </CardTitle>
              <CardDescription>Customize the Special Offers section on your homepage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="section-visibility" className="text-sm font-medium">Show Section</Label>
                    <p className="text-xs text-muted-foreground">Display the Special Offers section on the homepage</p>
                  </div>
                  <Switch
                    id="section-visibility"
                    checked={sectionVisible}
                    onCheckedChange={(checked) => {
                      setSectionVisible(checked);
                      updateSetting('special_offers_visible', checked);
                    }}
                    aria-label="Toggle special offers section visibility"
                  />
                </div>
              </div>
              <div className="space-y-3 p-4 border rounded-lg">
                <Label htmlFor="section-title">Section Title</Label>
                <Input
                  id="section-title"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  onBlur={() => updateSetting('special_offers_title', sectionTitle)}
                  placeholder="e.g., 🔥 Special Offers"
                />
              </div>
              <div className="space-y-3 p-4 border rounded-lg">
                <Label htmlFor="section-subtitle">Section Subtitle</Label>
                <Textarea
                  id="section-subtitle"
                  value={sectionSubtitle}
                  onChange={(e) => setSectionSubtitle(e.target.value)}
                  onBlur={() => updateSetting('special_offers_subtitle', sectionSubtitle)}
                  placeholder="e.g., Don't miss out on our limited-time deals!"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpecialOffersManager;