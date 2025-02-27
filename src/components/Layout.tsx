import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Award, 
  Home, 
  ShieldCheck, 
  FilePlus, 
  LayoutDashboard,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isIssuer, loading } = useAuth();

  // Protect routes: if not loading, no user, and the current route is not "/auth" or "/register", redirect to "/auth".
  useEffect(() => {
    if (!loading && !user && location.pathname !== "/auth" && location.pathname !== "/register") {
      navigate("/auth");
    }
  }, [loading, user, location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  const menuItems = [
    { path: "/", label: "Home", icon: Home },
    { path: isIssuer ? "/dashboard" : "/userdashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(isIssuer ? [{ path: "/issue", label: "Issue Certificate", icon: FilePlus }] : []),
    { path: "/verify", label: "Verify Certificate", icon: ShieldCheck },
  ];

  // Don't show sidebar on auth page (and optionally on register page if you want to keep the register page simple)
  if (location.pathname === "/auth" || location.pathname === "/register") {
    return <>{children}</>;
  }
  if (loading && location.pathname !== "/register") {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      
      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg md:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white shadow-xl transition-transform duration-300 transform 
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          w-64 z-40`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <div className="flex items-center space-x-2">
              <Award className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">CertifyChain</span>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                        ${location.pathname === item.path 
                          ? "bg-blue-50 text-blue-600" 
                          : "hover:bg-gray-50"}`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? "md:ml-64" : "ml-0"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen p-4 md:p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Layout;
