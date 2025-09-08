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
  ChevronRight
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string; // Legacy field for backward compatibility
  status_id: string;
  status_name: string;
  status_display_name: string;
  total_amount: number;
  discount_amount: number;
  discount_code: string | null;
  customer_info: any;
  shipping_address: any;
  created_at: string;
  order_items: any[];
}

interface AdminOrdersTableProps {
  orders: Order[];
  loading: boolean;
  selectedOrderStatus: string;
  setSelectedOrderStatus: (status: string) => void;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  getStatusActions: (order: Order) => React.ReactNode[];
  getStatusColor: (status: string) => string;
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
    const matchesStatus = selectedOrderStatus === 'all' || order.status_name === selectedOrderStatus;
    const matchesSearch = searchTerm === '' || 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_info?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_info?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_info?.phone?.includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status_display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_items?.some((item: any) => 
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.size?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesStatus && matchesSearch;
  });

  const handleOrderClick = (orderId: string) => {
    navigate(`/admin/order/${orderId}`);
  };

  const getOrderStatusData = () => {
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status_name] = (acc[order.status_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' },
      { name: 'Confirmed', value: statusCounts.confirmed || 0, color: '#3b82f6' },
      { name: 'Processing', value: statusCounts.processing || 0, color: '#f97316' },
      { name: 'Packed', value: statusCounts.packed || 0, color: '#6366f1' },
      { name: 'Shipped', value: statusCounts.shipped || 0, color: '#8b5cf6' },
      { name: 'Out for Delivery', value: statusCounts.out_for_delivery || 0, color: '#06b6d4' },
      { name: 'Delivered', value: statusCounts.delivered || 0, color: '#10b981' },
      { name: 'Cancelled', value: statusCounts.cancelled || 0, color: '#ef4444' },
      { name: 'Refunded', value: statusCounts.refunded || 0, color: '#6b7280' },
      { name: 'Failed', value: statusCounts.failed || 0, color: '#dc2626' }
    ];
  };

  return (
    <Card className="admin-card border-0 shadow-xl overflow-hidden">
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
                Track and manage all customer orders
              </CardDescription>
            </div>
          </div>
          
          {/* Controls - Mobile First Layout */}
          <div className="flex flex-col gap-3">
            {/* Search Bar - Full Width on Mobile */}
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Filter and View Mode Controls */}
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
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 bg-background rounded-lg border p-1 w-fit">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="flex items-center gap-1"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="flex items-center gap-1"
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
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <p className="text-muted-foreground text-lg">No orders found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchTerm 
                ? `No orders match "${searchTerm}"`
                : selectedOrderStatus === 'all' 
                  ? 'Orders will appear here when customers place them'
                  : `No ${selectedOrderStatus} orders at the moment`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Status Summary - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-6 lg:mb-8">
              {getOrderStatusData().map((status) => (
                <div key={status.name} className="text-center p-2 sm:p-4 bg-gradient-to-br from-white to-muted/30 rounded-xl border shadow-sm">
                  <div 
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mx-auto mb-1 sm:mb-2" 
                    style={{ backgroundColor: status.color }}
                  ></div>
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{status.value}</div>
                  <div className="text-xs text-muted-foreground">{status.name}</div>
                </div>
              ))}
            </div>

            {/* Orders Display */}
            {viewMode === 'table' ? (
              <div className="border rounded-lg overflow-hidden">
                {/* Mobile: Show table hint */}
                <div className="lg:hidden bg-muted/30 px-4 py-2 text-sm text-muted-foreground text-center">
                  Swipe horizontally to view all columns
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Order ID</TableHead>
                        <TableHead className="min-w-[200px]">Customer</TableHead>
                        <TableHead className="min-w-[100px]">Items</TableHead>
                        <TableHead className="min-w-[120px]">Total</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow 
                          key={order.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleOrderClick(order.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-sm"># {order.order_number}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{order.customer_info?.fullName || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {order.customer_info?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{order.order_items?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-emerald-600 text-sm">
                              KSh {order.total_amount.toLocaleString()}
                            </div>
                            {order.discount_amount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                -{order.discount_code}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(order.status_name)} text-white text-xs`}>
                              {order.status_display_name.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {new Date(order.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOrderClick(order.id);
                              }}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredOrders.map((order) => (
                  <Card 
                    key={order.id} 
                    className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-muted/10 cursor-pointer"
                    onClick={() => handleOrderClick(order.id)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4">
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg sm:text-xl text-primary">#{order.order_number}</h3>
                            <Badge className={`${getStatusColor(order.status_name)} text-white text-xs sm:text-sm px-2 sm:px-3 py-1 font-medium`}>
                              {order.status_display_name.toUpperCase()}
                            </Badge>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground self-end sm:self-auto" />
                        </div>
                        
                        {/* Card Content */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-foreground truncate">{order.customer_info?.fullName || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground truncate">📧 {order.customer_info?.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{order.shipping_address?.city || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                              <span className="font-bold text-emerald-700 text-base sm:text-lg">KSh {order.total_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">{order.order_items?.length || 0} items</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card Actions */}
                        <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                          {getStatusActions(order).map((action, index) => (
                            <div key={index} className="transform transition-all duration-200 hover:scale-105">
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminOrdersTable;