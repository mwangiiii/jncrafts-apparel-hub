
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import LockedPage from "./pages/LockedPage";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useLocation } from "react-router-dom";
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
import ResetPassword from "./pages/ResetPassword"; // Corrected path casing


const App = () => {
  const { user, isAdmin } = useAuth();
  const [locked, setLocked] = useState(false);
  const [unlockAt, setUnlockAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkLock = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<Database["public"]["Tables"]["system_status"]["Row"]>("system_status")
        .select("status, unlock_at")
        .order("id", { ascending: false })
        .limit(1)
        .single();
      if (!error && data) {
        const now = new Date();
        let isLocked = data.status;
        if (data.unlock_at && new Date(data.unlock_at) <= now) {
          isLocked = false;
        }
        setLocked(isLocked);
        setUnlockAt(data.unlock_at);
      } else {
        setLocked(false);
        setUnlockAt(null);
      }
      setLoading(false);
    };
    checkLock();
    // Optionally, poll every minute for auto-unlock
    const interval = setInterval(checkLock, 60000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Strict site lock: Only allow admins to access any route when locked
  if (!loading && locked && !isAdmin) {
    return <LockedPage />;
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/content" element={<AdminContentManager />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        <Route path="/messages" element={<UserMessages />} />
        <Route path="/messages/:conversationId" element={<UserMessages />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/sizechart" element={<SizeChart />} />
          <Route path="/resetpassword" element={<ResetPassword />} /> 
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  );
};

export default App;