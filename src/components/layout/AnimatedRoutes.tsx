import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './PageTransition';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';

// Page imports
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AdminAuth from '@/pages/AdminAuth';
import ResetPassword from '@/pages/ResetPassword';
import SetupProfile from '@/pages/SetupProfile';
import Discover from '@/pages/Discover';
import Matches from '@/pages/Matches';
import Messages from '@/pages/Messages';
import Profile from '@/pages/Profile';
import PublicProfile from '@/pages/PublicProfile';
import AdminDashboard from '@/pages/AdminDashboard';
import MasterAdminDashboard from '@/pages/MasterAdminDashboard';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import AdminReports from '@/pages/AdminReports';
import Projects from '@/pages/Projects';
import CollaborationRoom from '@/pages/CollaborationRoom';
import WhoLikedYou from '@/pages/WhoLikedYou';
import Studio from '@/pages/Studio';
import AdminSettings from '@/pages/AdminSettings';
import EditProfile from '@/pages/EditProfile';
import NotFound from '@/pages/NotFound';
import OpenProjects from '@/pages/OpenProjects';
import Marketplace from '@/pages/Marketplace';
import TeamManagement from '@/pages/TeamManagement';
import ApiAccess from '@/pages/ApiAccess';
import Jobs from '@/pages/Jobs';
import FeaturesPage from '@/pages/Features';
import HowItWorksPage from '@/pages/HowItWorksPage';
import Pricing from '@/pages/Pricing';
import SuccessStories from '@/pages/SuccessStories';
import About from '@/pages/About';
import Careers from '@/pages/Careers';
import Blog from '@/pages/Blog';
import Contact from '@/pages/Contact';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Cookies from '@/pages/Cookies';
import Settings from '@/pages/Settings';
import CollaborationFeed from '@/pages/CollaborationFeed';
import CreatorCredits from '@/pages/CreatorCredits';
import LocationDiscovery from '@/pages/LocationDiscovery';
import Explore from '@/pages/Explore';

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/admin-auth" element={<PageTransition><AdminAuth /></PageTransition>} />
        <Route path="/features" element={<PageTransition><FeaturesPage /></PageTransition>} />
        <Route path="/how-it-works" element={<PageTransition><HowItWorksPage /></PageTransition>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route path="/success-stories" element={<PageTransition><SuccessStories /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/careers" element={<PageTransition><Careers /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/cookies" element={<PageTransition><Cookies /></PageTransition>} />

        {/* Protected Routes */}
        <Route path="/setup-profile" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><SetupProfile /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/discover" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Discover /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/matches" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Matches /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/who-liked-you" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><WhoLikedYou /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/messages/:conversationId" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Messages /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Profile /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><EditProfile /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/profile/:userId" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><PublicProfile /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Projects /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><CollaborationRoom /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/studio/:itemId" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Studio /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/open-projects" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><OpenProjects /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/marketplace" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Marketplace /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/teams" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><TeamManagement /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/api-access" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><ApiAccess /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Jobs /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><Settings /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/feed" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><CollaborationFeed /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/credits" element={
          <ProtectedRoute>
            <Navbar />
            <PageTransition><CreatorCredits /></PageTransition>
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
            <PageTransition><AdminDashboard /></PageTransition>
          </AdminProtectedRoute>
        } />
        <Route path="/master-admin" element={
          <AdminProtectedRoute allowedRoles={['master_admin', 'super_admin']}>
            <PageTransition><MasterAdminDashboard /></PageTransition>
          </AdminProtectedRoute>
        } />
        <Route path="/super-admin" element={
          <AdminProtectedRoute allowedRoles={['super_admin']}>
            <PageTransition><SuperAdminDashboard /></PageTransition>
          </AdminProtectedRoute>
        } />
        <Route path="/admin-reports" element={
          <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
            <PageTransition><AdminReports /></PageTransition>
          </AdminProtectedRoute>
        } />
        <Route path="/admin-settings" element={
          <AdminProtectedRoute allowedRoles={['super_admin']}>
            <PageTransition><AdminSettings /></PageTransition>
          </AdminProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};
