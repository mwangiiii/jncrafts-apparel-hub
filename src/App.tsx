import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import LockedPage from "./pages/LockedPage";
import AdminLogin from "./pages/AdminLogin";
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
import ResetPassword from "./pages/ResetPassword";

type SystemStatus = Database["public"]["Tables"]["system_status"]["Row"];

const App = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [locked, setLocked] = useState(false);
  const [unlockAt, setUnlockAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // 🔧 ENHANCED: Better lock check with detailed logging and UTC consistency
  useEffect(() => {
    const checkLock = async () => {
      try {
        console.log("[SiteLock] 🔍 Starting lock check...");
        console.log("[SiteLock] Current user:", user?.email || "Not logged in");
        console.log("[SiteLock] Is admin:", isAdmin);
        console.log("[SiteLock] Current path:", location.pathname);
        
        setLoading(true);
        
        const { data, error } = await supabase
          .from("system_status")
          .select("status, unlock_at")
          .order("id", { ascending: false })
          .limit(1)
          .single();

        console.log("[SiteLock] 📊 Database response:", { data, error });

        if (error) {
          if (error.code === 'PGRST116') {
            console.log("[SiteLock] ✅ No status records found - site is UNLOCKED");
            setLocked(false);
            setUnlockAt(null);
          } else {
            console.error("[SiteLock] ❌ Error fetching lock status:", error);
            setLocked(false);
            setUnlockAt(null);
          }
        } else if (data) {
          const nowUTC = new Date().toISOString();
          let isLocked = data.status;

          console.log("[SiteLock] 📋 Database says:", {
            status: data.status,
            unlock_at: data.unlock_at,
            current_time_utc: nowUTC
          });

          // Check if unlock time has passed (auto-unlock) - using UTC comparison
          if (data.unlock_at && data.unlock_at <= nowUTC) {
            console.log("[SiteLock] ⏰ Auto-unlock time has passed, unlocking site");
            isLocked = false;
            
            // Update database to reflect auto-unlock
            try {
              await supabase
                .from("system_status")
                .insert({ status: false, unlock_at: null });
              console.log("[SiteLock] ✅ Auto-unlock record created");
            } catch (unlockError) {
              console.error("[SiteLock] ❌ Failed to create auto-unlock record:", unlockError);
            }
          }

          setLocked(isLocked);
          setUnlockAt(data.unlock_at);
          
          console.log("[SiteLock] 🎯 Final lock state:", {
            locked: isLocked,
            unlockAt: data.unlock_at,
            willBlockUser: isLocked && !isAdmin && location.pathname !== '/admin/login'
          });
        } else {
          console.log("[SiteLock] ⚠️ No data returned - defaulting to UNLOCKED");
          setLocked(false);
          setUnlockAt(null);
        }
      } catch (err) {
        console.error("[SiteLock] ❌ Unexpected error during lock check:", err);
        setLocked(false);
        setUnlockAt(null);
      } finally {
        setLoading(false);
        console.log("[SiteLock] ✅ Lock check complete");
      }
    };

    // Only check lock after auth has loaded
    if (!authLoading) {
      checkLock();
    }

    // Poll every 30 seconds to check for lock status changes
    const interval = setInterval(() => {
      if (!authLoading) {
        checkLock();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [location.pathname, user, isAdmin, authLoading]);

  // 🔧 ENHANCED: Wait for both auth and lock check to complete
  if (authLoading || loading) {
    console.log("[SiteLock] ⏳ Loading... Auth:", authLoading, "Lock:", loading);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // 🔑 CRITICAL: Check if current route is the admin login page
  const isAdminLoginRoute = location.pathname === '/admin/login';

  // 🔧 ENHANCED: More explicit lock check with logging
  const shouldBlockAccess = locked && !isAdmin && !isAdminLoginRoute;
  
  console.log("[SiteLock] 🚦 Access Decision:", {
    locked,
    isAdmin,
    isAdminLoginRoute,
    shouldBlockAccess,
    action: shouldBlockAccess ? "BLOCKING" : "ALLOWING"
  });

  // Site lock logic: Block non-admin users EXCEPT on admin login page
  if (shouldBlockAccess) {
    console.log("[SiteLock] 🚫 BLOCKING ACCESS - Rendering LockedPage");
    return <LockedPage />;
  }

  console.log("[SiteLock] ✅ ALLOWING ACCESS - Rendering normal routes");

  // If we reach here, either:
  // 1. Site is unlocked, OR
  // 2. User is an admin, OR
  // 3. User is on the admin login page
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        {/* 🔑 ADMIN LOGIN ROUTE - Must be first for priority and always accessible */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        
        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/content" element={<AdminContentManager />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        
        {/* User routes */}
        <Route path="/messages" element={<UserMessages />} />
        <Route path="/messages/:conversationId" element={<UserMessages />} />
        <Route path="/wishlist" element={<Wishlist />} />
        
        {/* Product routes */}
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/sizechart" element={<SizeChart />} />
        
        {/* Utility routes */}
        <Route path="/resetpassword" element={<ResetPassword />} /> 
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        
        {/* Catch-all route - MUST BE LAST */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  );
};

export default App;