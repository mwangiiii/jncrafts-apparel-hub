import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, 
  DollarSign, 
  Users, 
  Calendar, 
  MapPin, 
  Eye, 
  Search,
  Grid,
  List,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface OrderItem {
  product: { name: string };
  variant: { size: { name: string }; color: { name: string } };
  quantity: number;
  price: number;
  image_url: string | null;
}

interface OrderStatus {
  id: string;
  name: string;
  display_name: string;
}

interface Order {
  id: string;
  order_number: string;
  status_id: string;
  order_status: OrderStatus | null;
  total_amount: number;
  discount_amount: number;
  discount?: { id: string; code: string; name: string };
  customer_info: any;
  shipping_address: any;
  created_at: string;
  order_items: OrderItem[];
}

interface AdminOrdersTableProps {
  orders: Order[];
  loading: boolean;
  selectedOrderStatus: string;
  setSelectedOrderStatus: (status: string) => void;
  onStatusUpdate: (orderId: string, newStatusId: string) => void;
  getStatusActions: (order: Order) => React.ReactNode[];
  getStatusColor: (statusName: string) => string;
}

const AdminOrdersTable = ({
  orders,
  loading,
  selectedOrderStatus,
  setSelectedOrderStatus,
  onStatusUpdate,
  getStatusActions,
  getStatusColor
}: AdminOrdersTableProps) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredOrders = orders.filter(order => {
    const statusName = order.order_status?.name || '';
    const matchesStatus = selectedOrderStatus === 'all' || statusName === selectedOrderStatus;
    const matchesSearch = searchTerm === '' || 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_info?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_info?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_info?.phone?.includes(searchTerm) ||
      order.shipping_address?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.street?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_status?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_items?.some((item: OrderItem) => 
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variant.size.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variant.color.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesStatus && matchesSearch;
  });

  const handleOrderClick = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const getOrderStatusData = () => {
    const statusCounts = orders.reduce((acc, order) => {
      const statusName = order.order_status?.name || 'unknown';
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' },
      { name: 'Confirmed', value: statusCounts.confirmed || 0, color: '#3b82f6' },
      { name: 'Processing', value: statusCounts.processing || 0, color: '#f97316' },
      { name: 'Shipped', value: statusCounts.shipped || 0, color: '#8b5cf6' },
      { name: 'Delivered', value: statusCounts.delivered || 0, color: '#10b981' },
      { name: 'Cancelled', value: statusCounts.cancelled || 0, color: '#ef4444' }
    ];
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-10 w-full sm:w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {getOrderStatusData().map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/50 pb-6">
        <div className="flex flex-col gap-4">
          {/* Header Title */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">Order Management</CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1">
                Track, filter, and manage customer orders efficiently
              </CardDescription>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order #, customer, product, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Filter & View */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Select value={selectedOrderStatus} onValueChange={setSelectedOrderStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 bg-background rounded-lg border p-1 w-fit">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="flex items-center gap-1 h-9"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="flex items-center gap-1 h-9"
                >
                  <Grid className="h-4 w-4" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 lg:p-8">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No Orders Found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchTerm 
                ? `No orders match "${searchTerm}"` 
                : selectedOrderStatus === 'all' 
                  ? 'Orders will appear here when customers place them' 
                  : `No ${selectedOrderStatus} orders at the moment`
              }
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')} className="gap-2">
                <X className="h-4 w-4" />
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              {getOrderStatusData().map((status) => (
                <div 
                  key={status.name} 
                  className="text-center p-3 sm:p-4 bg-gradient-to-br from-white to-muted/30 rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-default"
                >
                  <div 
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mx-auto mb-2" 
                    style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}40` }}
                  />
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{status.value}</div>
                  <div className="text-xs text-muted-foreground capitalize">{status.name}</div>
                </div>
              ))}
            </div>

            {/* Display Mode */}
            {viewMode === 'table' ? (
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="lg:hidden bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
                  Swipe left/right to view all columns
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px] w-full">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-[140px]">Order #</TableHead>
                        <TableHead className="min-w-[200px]">Customer</TableHead>
                        <TableHead className="min-w-[120px]">Items</TableHead>
                        <TableHead className="min-w-[140px]">Total</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Date</TableHead>
                        <TableHead className="min-w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const statusName = order.order_status?.name || 'unknown';
                        return (
                          <TableRow 
                            key={order.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors border-b hover:border-primary/30"
                            onClick={() => handleOrderClick(order.id)}
                          >
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-primary font-semibold">#{order.order_number}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm truncate max-w-[180px]">{order.customer_info?.fullName || 'N/A'}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {order.customer_info?.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{order.order_items.length}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-emerald-600 text-sm">
                                KSh {order.total_amount.toLocaleString()}
                              </div>
                              {order.discount_amount > 0 && (
                                <div className="text-xs text-muted-foreground -mt-1">
                                  -{order.discount?.code || 'Discount'}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={cn(
                                  "text-xs font-medium px-3 py-1",
                                  getStatusColor(statusName)
                                )}
                              >
                                {order.order_status?.display_name?.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOrderClick(order.id);
                                }}
                                className="h-8 text-xs gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {filteredOrders.map((order) => {
                  const statusName = order.order_status?.name || 'unknown';
                  return (
                    <Card 
                      key={order.id} 
                      className={cn(
                        "border-l-4 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden",
                        getStatusColor(statusName).replace('bg-', 'border-l-')
                      )}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <CardContent className="p-4 sm:p-6 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg truncate text-primary"># {order.order_number}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                className={cn(
                                  "text-xs px-2 py-1 font-medium",
                                  getStatusColor(statusName)
                                )}
                              >
                                {order.order_status?.display_name?.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                        
                        {/* Customer & Items */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{order.customer_info?.fullName || 'N/A'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {order.customer_info?.email}
                            </div>
                          </div>
                          <div className="space-y-2 text-right sm:text-left">
                            <div className="flex items-center justify-end sm:justify-start gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{order.order_items.length} items</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Total */}
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total:</span>
                            <span className="font-bold text-lg text-emerald-600">
                              KSh {order.total_amount.toLocaleString()}
                            </span>
                          </div>
                          {order.discount_amount > 0 && (
                            <div className="flex items-center justify-between text-xs text-emerald-600">
                              <span>Discount: -{order.discount?.code || 'Code'}</span>
                              <span>KSh {order.discount_amount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions - Stop propagation */}
                        <div 
                          className="flex flex-wrap gap-2 pt-2 border-t" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getStatusActions(order).map((action, index) => (
                            <div key={index} className="transform transition-all duration-200 hover:scale-105">
                              {action}
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order.id);
                            }}
                            className="h-8 text-xs gap-1 flex-1 sm:flex-none"
                          >
                            <Eye className="h-3 w-3" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminOrdersTable;