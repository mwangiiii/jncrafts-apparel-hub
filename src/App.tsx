import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import AdminProducts from "./pages/AdminProducts";
import AdminMessages from "./pages/AdminMessages";
import AdminCategories from "./pages/AdminCategories";
import AdminContentManager from "./pages/AdminContentManager";
import UserMessages from "./pages/UserMessages";
import Wishlist from "./pages/Wishlist";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";
import SizeChart from "./pages/SizeChart";
import PaymentSuccessPage from "./pages/PaystackRedirect";

const App = () => (
  
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/order/:orderId" element={<AdminOrderDetail />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/content" element={<AdminContentManager />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        <Route path="/messages" element={<UserMessages />} />
        <Route path="/messages/:conversationId" element={<UserMessages />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/sizechart" element={<SizeChart />} />
        <Route path="/paystack-redirect" element={<PaymentSuccessPage />} />
        <Route path="admin/orders/:id" element={<OrderDetails />}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  
);

export default App;
