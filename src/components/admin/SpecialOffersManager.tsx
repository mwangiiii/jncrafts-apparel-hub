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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Eye, EyeOff, Settings, Tag, Calendar, Users, Package } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Discount {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  banner_message: string | null;
  applies_to: 'all' | 'specific' | 'category';
  requires_code: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  used_count: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  is_active: boolean;
}

interface DiscountFormData {
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  banner_message: string;
  applies_to: 'all' | 'specific' | 'category';
  requires_code: boolean;
  code: string;
  start_date: string;
  end_date: string;
  usage_limit: string;
  selectedProducts: string[];
  selectedCategories: string[];
}

const SpecialOffersManager = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
    banner_message: '',
    applies_to: 'all',
    requires_code: true,
    code: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    selectedProducts: [],
    selectedCategories: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchDiscounts(),
      fetchProducts(),
      fetchSettings()
    ]);
    setLoading(false);
  };

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts((data || []) as Discount[]);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, price, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(p => p.category) || [])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['special_offers_visible', 'special_offers_title', 'special_offers_subtitle']);

      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      if (settingsMap) {
        setSectionVisible(settingsMap.special_offers_visible === 'true' || settingsMap.special_offers_visible === true);
        setSectionTitle(settingsMap.special_offers_title || '🔥 Special Offers');
        setSectionSubtitle(settingsMap.special_offers_subtitle || "Don't miss out on our limited-time deals and exclusive discounts");
      }
    } catch (error) {
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
        description: "Section settings have been updated successfully."
      });
    } catch (error) {
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
      banner_message: '',
      applies_to: 'all',
      requires_code: true,
      code: '',
      start_date: '',
      end_date: '',
      usage_limit: '',
      selectedProducts: [],
      selectedCategories: []
    });
    setEditingDiscount(null);
  };

  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value.toString(),
      banner_message: discount.banner_message || '',
      applies_to: discount.applies_to,
      requires_code: discount.requires_code,
      code: discount.code,
      start_date: discount.start_date ? new Date(discount.start_date).toISOString().slice(0, 16) : '',
      end_date: discount.end_date ? new Date(discount.end_date).toISOString().slice(0, 16) : '',
      usage_limit: discount.usage_limit?.toString() || '',
      selectedProducts: [],
      selectedCategories: []
    });
    setIsDiscountDialogOpen(true);
  };

  const handleSubmitDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const discountData = {
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        banner_message: formData.banner_message || null,
        applies_to: formData.applies_to,
        requires_code: formData.requires_code,
        code: formData.code,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: true
      };

      let discountId: string;

      if (editingDiscount) {
        const { error } = await supabase
          .from('discounts')
          .update(discountData)
          .eq('id', editingDiscount.id);

        if (error) throw error;
        discountId = editingDiscount.id;
        
        toast({
          title: "Success",
          description: "Special offer updated successfully"
        });
      } else {
        const { data, error } = await supabase
          .from('discounts')
          .insert(discountData)
          .select()
          .single();

        if (error) throw error;
        discountId = data.id;
        
        toast({
          title: "Success", 
          description: "Special offer created successfully"
        });
      }

      // Handle product/category associations
      if (formData.applies_to === 'specific' && formData.selectedProducts.length > 0) {
        // Delete existing associations
        await supabase
          .from('discount_products')
          .delete()
          .eq('discount_id', discountId);

        // Insert new product associations
        const productAssociations = formData.selectedProducts.map(productId => ({
          discount_id: discountId,
          product_id: productId
        }));

        const { error: associationError } = await supabase
          .from('discount_products')
          .insert(productAssociations);

        if (associationError) throw associationError;
      }

      if (formData.applies_to === 'category' && formData.selectedCategories.length > 0) {
        // Delete existing associations
        await supabase
          .from('discount_products')
          .delete()
          .eq('discount_id', discountId);

        // Insert new category associations
        const categoryAssociations = formData.selectedCategories.map(category => ({
          discount_id: discountId,
          category: category
        }));

        const { error: associationError } = await supabase
          .from('discount_products')
          .insert(categoryAssociations);

        if (associationError) throw associationError;
      }

      setIsDiscountDialogOpen(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error saving discount:', error);
      toast({
        title: "Error",
        description: "Failed to save special offer",
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

      fetchDiscounts();
      toast({
        title: "Success",
        description: `Special offer ${discount.is_active ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Error toggling discount status:', error);
      toast({
        title: "Error",
        description: "Failed to update special offer status",
        variant: "destructive"
      });
    }
  };

  const deleteDiscount = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this special offer?')) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', discountId);

      if (error) throw error;

      fetchDiscounts();
      toast({
        title: "Success",
        description: "Special offer deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast({
        title: "Error",
        description: "Failed to delete special offer",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="offers">Special Offers</TabsTrigger>
          <TabsTrigger value="settings">Section Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Special Offers Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage special offers, discounts, and promotional campaigns
                  </CardDescription>
                </div>
                <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Offer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingDiscount ? 'Edit Special Offer' : 'Create Special Offer'}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmitDiscount} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Offer Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Back to School Sale"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="banner_message">Banner Message (Optional)</Label>
                          <Input
                            id="banner_message"
                            value={formData.banner_message}
                            onChange={(e) => setFormData(prev => ({ ...prev, banner_message: e.target.value }))}
                            placeholder="e.g., LIMITED TIME ONLY"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your special offer..."
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="discount_type">Discount Type</Label>
                          <Select
                            value={formData.discount_type}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value as 'percentage' | 'fixed' }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="discount_value">Discount Value</Label>
                          <Input
                            id="discount_value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.discount_value}
                            onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                            placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="applies_to">Applies To</Label>
                        <Select
                          value={formData.applies_to}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, applies_to: value as 'all' | 'specific' | 'category' }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            <SelectItem value="specific">Specific Products</SelectItem>
                            <SelectItem value="category">Product Categories</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.applies_to === 'specific' && (
                        <div>
                          <Label>Select Products</Label>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                            {products.map((product) => (
                              <div key={product.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={product.id}
                                  checked={formData.selectedProducts.includes(product.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        selectedProducts: [...prev.selectedProducts, product.id]
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        selectedProducts: prev.selectedProducts.filter(id => id !== product.id)
                                      }));
                                    }
                                  }}
                                />
                                <Label htmlFor={product.id} className="text-sm">
                                  {product.name} (${product.price})
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.applies_to === 'category' && (
                        <div>
                          <Label>Select Categories</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {categories.map((category) => (
                              <div key={category} className="flex items-center space-x-2">
                                <Checkbox
                                  id={category}
                                  checked={formData.selectedCategories.includes(category)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        selectedCategories: [...prev.selectedCategories, category]
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        selectedCategories: prev.selectedCategories.filter(cat => cat !== category)
                                      }));
                                    }
                                  }}
                                />
                                <Label htmlFor={category} className="text-sm capitalize">
                                  {category}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requires_code"
                          checked={formData.requires_code}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_code: checked as boolean }))}
                        />
                        <Label htmlFor="requires_code">Require Promo Code</Label>
                      </div>

                      {formData.requires_code && (
                        <div>
                          <Label htmlFor="code">Promo Code</Label>
                          <div className="flex gap-2">
                            <Input
                              id="code"
                              value={formData.code}
                              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              placeholder="SPECIAL25"
                              required={formData.requires_code}
                            />
                            <Button type="button" variant="outline" onClick={generatePromoCode}>
                              Generate
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_date">Start Date (Optional)</Label>
                          <Input
                            id="start_date"
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end_date">End Date (Optional)</Label>
                          <Input
                            id="end_date"
                            type="datetime-local"
                            value={formData.end_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="usage_limit">Usage Limit (Optional)</Label>
                        <Input
                          id="usage_limit"
                          type="number"
                          min="1"
                          value={formData.usage_limit}
                          onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                          placeholder="Leave empty for unlimited uses"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingDiscount ? 'Update Offer' : 'Create Offer'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {discounts.map((discount) => (
                  <Card key={discount.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{discount.name}</h3>
                          <Badge variant={discount.is_active ? "default" : "secondary"}>
                            {discount.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {discount.banner_message && (
                            <Badge variant="outline" className="text-orange-600">
                              {discount.banner_message}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-2">{discount.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {discount.discount_type === 'percentage' 
                              ? `${discount.discount_value}% OFF`
                              : `$${discount.discount_value} OFF`
                            }
                          </span>
                          {discount.requires_code && (
                            <span className="font-mono bg-muted px-2 py-1 rounded">
                              {discount.code}
                            </span>
                          )}
                          <span>Used: {discount.used_count}/{discount.usage_limit || '∞'}</span>
                          {discount.end_date && (
                            <span>
                              Expires: {new Date(discount.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDiscountStatus(discount)}
                        >
                          {discount.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(discount)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDiscount(discount.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {discounts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No special offers created yet. Create your first offer to get started!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Section Settings
              </CardTitle>
              <CardDescription>
                Configure how the Special Offers section appears on your homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="section-visibility">Section Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Show or hide the Special Offers section on the homepage
                  </p>
                </div>
                <Switch
                  id="section-visibility"
                  checked={sectionVisible}
                  onCheckedChange={(checked) => {
                    setSectionVisible(checked);
                    updateSetting('special_offers_visible', checked);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="section-title">Section Title</Label>
                <Input
                  id="section-title"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  onBlur={() => updateSetting('special_offers_title', sectionTitle)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="section-subtitle">Section Subtitle</Label>
                <Textarea
                  id="section-subtitle"
                  value={sectionSubtitle}
                  onChange={(e) => setSectionSubtitle(e.target.value)}
                  onBlur={() => updateSetting('special_offers_subtitle', sectionSubtitle)}
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