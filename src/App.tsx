import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import SetupProfile from "./pages/SetupProfile";
import Discover from "./pages/Discover";
import Matches from "./pages/Matches";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import AdminDashboard from "./pages/AdminDashboard";
import MasterAdminDashboard from "./pages/MasterAdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AdminReports from "./pages/AdminReports";
import Projects from "./pages/Projects";
import CollaborationRoom from "./pages/CollaborationRoom";
import WhoLikedYou from "./pages/WhoLikedYou";
import Studio from "./pages/Studio";
import AdminSettings from "./pages/AdminSettings";
import EditProfile from "./pages/EditProfile";
import NotFound from "./pages/NotFound";
import OpenProjects from "./pages/OpenProjects";
import Marketplace from "./pages/Marketplace";
import TeamManagement from "./pages/TeamManagement";
import ApiAccess from "./pages/ApiAccess";
import Jobs from "./pages/Jobs";
import FeaturesPage from "./pages/Features";
import HowItWorksPage from "./pages/HowItWorksPage";
import Pricing from "./pages/Pricing";
import SuccessStories from "./pages/SuccessStories";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnalyticsProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin-auth" element={<AdminAuth />} />
              <Route path="/setup-profile" element={<ProtectedRoute><Navbar /><SetupProfile /></ProtectedRoute>} />
              <Route path="/discover" element={<ProtectedRoute><Navbar /><Discover /></ProtectedRoute>} />
              <Route path="/matches" element={<ProtectedRoute><Navbar /><Matches /></ProtectedRoute>} />
              <Route path="/who-liked-you" element={<ProtectedRoute><Navbar /><WhoLikedYou /></ProtectedRoute>} />
              <Route path="/messages/:conversationId" element={<ProtectedRoute><Navbar /><Messages /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Navbar /><Profile /></ProtectedRoute>} />
              <Route path="/edit-profile" element={<ProtectedRoute><Navbar /><EditProfile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><Navbar /><PublicProfile /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/master-admin" element={<AdminProtectedRoute allowedRoles={['master_admin', 'super_admin']}><MasterAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/super-admin" element={<AdminProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin-reports" element={<AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}><AdminReports /></AdminProtectedRoute>} />
              <Route path="/admin-settings" element={<AdminProtectedRoute allowedRoles={['super_admin']}><AdminSettings /></AdminProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Navbar /><Projects /></ProtectedRoute>} />
              <Route path="/projects/:projectId" element={<ProtectedRoute><Navbar /><CollaborationRoom /></ProtectedRoute>} />
              <Route path="/studio/:itemId" element={<ProtectedRoute><Navbar /><Studio /></ProtectedRoute>} />
              <Route path="/open-projects" element={<ProtectedRoute><Navbar /><OpenProjects /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><Navbar /><Marketplace /></ProtectedRoute>} />
              <Route path="/teams" element={<ProtectedRoute><Navbar /><TeamManagement /></ProtectedRoute>} />
              <Route path="/api-access" element={<ProtectedRoute><Navbar /><ApiAccess /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute><Navbar /><Jobs /></ProtectedRoute>} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/success-stories" element={<SuccessStories />} />
              <Route path="/about" element={<About />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnalyticsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
