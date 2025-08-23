// Enhanced search functionality for admin dashboard
export const enhancedSearch = (
  orders: any[],
  products: any[],
  searchTerm: string
) => {
  if (!searchTerm) {
    return {
      orders: orders,
      products: products,
      searchResults: []
    };
  }

  const term = searchTerm.toLowerCase();
  
  // Search through orders
  const matchingOrders = orders.filter(order => {
    return (
      order.order_number?.toLowerCase().includes(term) ||
      order.customer_info?.fullName?.toLowerCase().includes(term) ||
      order.customer_info?.email?.toLowerCase().includes(term) ||
      order.customer_info?.phone?.includes(term) ||
      order.shipping_address?.city?.toLowerCase().includes(term) ||
      order.shipping_address?.address?.toLowerCase().includes(term) ||
      order.status?.toLowerCase().includes(term) ||
      order.order_items?.some((item: any) => 
        item.product_name?.toLowerCase().includes(term) ||
        item.size?.toLowerCase().includes(term) ||
        item.color?.toLowerCase().includes(term)
      )
    );
  });

  // Search through products  
  const matchingProducts = products.filter(product => {
    return (
      product.name?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term) ||
      product.sizes?.some((size: string) => size.toLowerCase().includes(term)) ||
      product.colors?.some((color: string) => color.toLowerCase().includes(term))
    );
  });

  // Create comprehensive search results
  const searchResults = [
    ...matchingOrders.map(order => ({
      type: 'order',
      id: order.id,
      title: `Order #${order.order_number}`,
      subtitle: `${order.customer_info?.fullName} - KSh ${order.total_amount?.toLocaleString()}`,
      status: order.status,
      date: order.created_at,
      data: order
    })),
    ...matchingProducts.map(product => ({
      type: 'product',
      id: product.id,
      title: product.name,
      subtitle: `${product.category} - KSh ${product.price?.toLocaleString()} - Stock: ${product.stock_quantity}`,
      status: product.is_active ? 'active' : 'inactive',
      date: product.created_at,
      data: product
    }))
  ];

  return {
    orders: matchingOrders,
    products: matchingProducts,
    searchResults: searchResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  };
};