// import { useState, useEffect } from "react";
// import { Plus, Trash2, Star } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Switch } from "@/components/ui/switch";
// import { useToast } from "@/hooks/use-toast";
// import { supabase } from '@/integrations/supabase/client';
// import { Product } from '@/types/database';
// import { getPrimaryImage } from '@/components/ProductDisplayHelper';

// interface FeaturedProduct {
//   id: string;
//   product_id: string;
//   display_order: number;
//   is_active: boolean;
//   product?: Product;
// }

// const FeaturedProductsManager = () => {
//   const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
//   const [allProducts, setAllProducts] = useState<Product[]>([]);
//   const [selectedProductId, setSelectedProductId] = useState<string>("");
//   const [loading, setLoading] = useState(true);
//   const { toast } = useToast();

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       // Fetch featured products
//       const { data: featuredData, error: featuredError } = await supabase
//         .from('homepage_featured')
//         .select(`
//           *,
//           product:products(*)
//         `)
//         .order('display_order', { ascending: true });

//       if (featuredError) throw featuredError;

//       // Fetch all products for dropdown
//         const { data: productsData, error: productsError } = await supabase
//           .from('products')
//           .select('id, name, price, category, stock_quantity, is_active, created_at, updated_at')
//           .eq('is_active', true)
//           .order('name', { ascending: true });

//       if (productsError) throw productsError;

//       // Transform products with empty relations
//       const transformedProducts = (productsData || []).map(p => ({
//         ...p,
//         images: [], // Will be loaded on demand
//         sizes: [],
//         colors: [],
//         videos: [],
//         description: null
//       }));

//       setFeaturedProducts(featuredData || []);
//       setAllProducts(transformedProducts);
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       toast({
//         title: "Error",
//         description: "Failed to load data.",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAddFeatured = async () => {
//     if (!selectedProductId) {
//       toast({
//         title: "Error",
//         description: "Please select a product.",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Check if already featured
//     if (featuredProducts.some(fp => fp.product_id === selectedProductId)) {
//       toast({
//         title: "Error",
//         description: "This product is already featured.",
//         variant: "destructive",
//       });
//       return;
//     }

//     try {
//       const displayOrder = featuredProducts.length;

//       const { error } = await supabase
//         .from('homepage_featured')
//         .insert([{
//           product_id: selectedProductId,
//           display_order: displayOrder,
//           is_active: true
//         }]);

//       if (error) throw error;

//       toast({
//         title: "Success",
//         description: "Product added to featured list.",
//       });

//       setSelectedProductId("");
//       fetchData();
//     } catch (error) {
//       console.error('Error adding featured product:', error);
//       toast({
//         title: "Error",
//         description: "Failed to add featured product.",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleRemoveFeatured = async (id: string) => {
//     try {
//       const { error } = await supabase
//         .from('homepage_featured')
//         .delete()
//         .eq('id', id);

//       if (error) throw error;

//       toast({
//         title: "Success",
//         description: "Featured product removed.",
//       });

//       fetchData();
//     } catch (error) {
//       console.error('Error removing featured product:', error);
//       toast({
//         title: "Error",
//         description: "Failed to remove featured product.",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleToggleActive = async (id: string, isActive: boolean) => {
//     try {
//       const { error } = await supabase
//         .from('homepage_featured')
//         .update({ is_active: isActive })
//         .eq('id', id);

//       if (error) throw error;

//       setFeaturedProducts(prev => 
//         prev.map(item => 
//           item.id === id ? { ...item, is_active: isActive } : item
//         )
//       );

//       toast({
//         title: "Success",
//         description: `Featured product ${isActive ? 'activated' : 'deactivated'}.`,
//       });
//     } catch (error) {
//       console.error('Error updating featured product:', error);
//       toast({
//         title: "Error",
//         description: "Failed to update featured product.",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleReorder = async (id: string, newOrder: number) => {
//     try {
//       const { error } = await supabase
//         .from('homepage_featured')
//         .update({ display_order: newOrder })
//         .eq('id', id);

//       if (error) throw error;

//       fetchData();
//     } catch (error) {
//       console.error('Error reordering featured product:', error);
//       toast({
//         title: "Error",
//         description: "Failed to reorder featured product.",
//         variant: "destructive",
//       });
//     }
//   };

//   if (loading) {
//     return <div className="p-4">Loading featured products...</div>;
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <Star className="h-5 w-5" />
//           Featured Products Manager
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="space-y-6">
//         {/* Add New Featured Product */}
//         <div className="flex gap-4 items-end">
//           <div className="flex-1">
//             <Label htmlFor="product-select">Add Product to Featured</Label>
//             <Select value={selectedProductId} onValueChange={setSelectedProductId}>
//               <SelectTrigger>
//                 <SelectValue placeholder="Select a product" />
//               </SelectTrigger>
//               <SelectContent>
//                 {allProducts
//                   .filter(product => 
//                     !featuredProducts.some(fp => fp.product_id === product.id)
//                   )
//                   .map((product) => (
//                     <SelectItem key={product.id} value={product.id}>
//                       {product.name} - ${product.price}
//                     </SelectItem>
//                   ))}
//               </SelectContent>
//             </Select>
//           </div>
//           <Button onClick={handleAddFeatured}>
//             <Plus className="h-4 w-4 mr-2" />
//             Add Featured
//           </Button>
//         </div>

//         {/* Featured Products List */}
//         <div className="space-y-4">
//           <h3 className="font-medium">
//             Current Featured Products ({featuredProducts.length})
//           </h3>
//           {featuredProducts.length === 0 ? (
//             <p className="text-muted-foreground text-center py-8">
//               No featured products set yet.
//             </p>
//           ) : (
//             <div className="space-y-4">
//               {featuredProducts.map((featured) => {
//                 const product = featured.product;
//                 if (!product) return null;

//                 return (
//                   <Card key={featured.id} className={`p-4 ${!featured.is_active ? 'opacity-50' : ''}`}>
//                     <div className="flex items-center gap-4">
//                       {/* Product Preview */}
//                       <div className="w-20 h-20 flex-shrink-0">
//                         <img
//                           src={product ? getPrimaryImage(product) : '/placeholder.svg'}
//                           alt={product.name}
//                           className="w-full h-full object-cover rounded"
//                         />
//                       </div>

//                       {/* Product Info */}
//                       <div className="flex-1 space-y-2">
//                         <div>
//                           <h4 className="font-medium">{product.name}</h4>
//                           <p className="text-sm text-muted-foreground">
//                             {product.category} - ${product.price}
//                           </p>
//                         </div>
//                         <div className="flex items-center gap-4">
//                           <div className="flex items-center gap-2">
//                             <Label htmlFor={`active-${featured.id}`} className="text-sm">
//                               Active
//                             </Label>
//                             <Switch
//                               id={`active-${featured.id}`}
//                               checked={featured.is_active}
//                               onCheckedChange={(checked) => 
//                                 handleToggleActive(featured.id, checked)
//                               }
//                             />
//                           </div>
//                           <div className="flex items-center gap-2">
//                             <Label htmlFor={`order-${featured.id}`} className="text-sm">
//                               Order:
//                             </Label>
//                             <Input
//                               id={`order-${featured.id}`}
//                               type="number"
//                               value={featured.display_order}
//                               onChange={(e) => 
//                                 handleReorder(featured.id, parseInt(e.target.value) || 0)
//                               }
//                               className="w-20"
//                             />
//                           </div>
//                         </div>
//                       </div>

//                       {/* Actions */}
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handleRemoveFeatured(featured.id)}
//                         className="text-destructive hover:text-destructive"
//                       >
//                         <Trash2 className="h-4 w-4" />
//                       </Button>
//                     </div>
//                   </Card>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default FeaturedProductsManager;