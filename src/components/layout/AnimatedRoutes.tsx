import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { PageTransition } from './PageTransition';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Lazy-loaded pages
const Index = lazyWithRetry(() => import('@/pages/Index'));
const Auth = lazyWithRetry(() => import('@/pages/Auth'));
const AuthCallback = lazyWithRetry(() => import('@/pages/AuthCallback'));
const AdminAuth = lazyWithRetry(() => import('@/pages/AdminAuth'));
const ResetPassword = lazyWithRetry(() => import('@/pages/ResetPassword'));
const ForcePasswordChange = lazyWithRetry(() => import('@/pages/ForcePasswordChange'));
const SetupProfile = lazyWithRetry(() => import('@/pages/SetupProfile'));
const Discover = lazyWithRetry(() => import('@/pages/Discover'));
const Matches = lazyWithRetry(() => import('@/pages/Matches'));
const Messages = lazyWithRetry(() => import('@/pages/Messages'));
const Profile = lazyWithRetry(() => import('@/pages/Profile'));
const PublicProfile = lazyWithRetry(() => import('@/pages/PublicProfile'));
const EditProfile = lazyWithRetry(() => import('@/pages/EditProfile'));
const AdminDashboard = lazyWithRetry(() => import('@/pages/AdminDashboard'));
const MasterAdminDashboard = lazyWithRetry(() => import('@/pages/MasterAdminDashboard'));
const SuperAdminDashboard = lazyWithRetry(() => import('@/pages/SuperAdminDashboard'));
const AdminReports = lazyWithRetry(() => import('@/pages/AdminReports'));
const AdminSettings = lazyWithRetry(() => import('@/pages/AdminSettings'));
const Projects = lazyWithRetry(() => import('@/pages/Projects'));
const CollaborationRoom = lazyWithRetry(() => import('@/pages/CollaborationRoom'));
const WhoLikedYou = lazyWithRetry(() => import('@/pages/WhoLikedYou'));
const Studio = lazyWithRetry(() => import('@/pages/Studio'));
const OpenProjects = lazyWithRetry(() => import('@/pages/OpenProjects'));
const Marketplace = lazyWithRetry(() => import('@/pages/Marketplace'));
const TeamManagement = lazyWithRetry(() => import('@/pages/TeamManagement'));
const ApiAccess = lazyWithRetry(() => import('@/pages/ApiAccess'));
const Jobs = lazyWithRetry(() => import('@/pages/Jobs'));
const FeaturesPage = lazyWithRetry(() => import('@/pages/Features'));
const HowItWorksPage = lazyWithRetry(() => import('@/pages/HowItWorksPage'));
const Pricing = lazyWithRetry(() => import('@/pages/Pricing'));
const SuccessStories = lazyWithRetry(() => import('@/pages/SuccessStories'));
const About = lazyWithRetry(() => import('@/pages/About'));
const Careers = lazyWithRetry(() => import('@/pages/Careers'));
const Blog = lazyWithRetry(() => import('@/pages/Blog'));
const HowToFindAMusicProducer = lazyWithRetry(() => import('@/pages/blog/HowToFindAMusicProducer'));
const Contact = lazyWithRetry(() => import('@/pages/Contact'));
const Privacy = lazyWithRetry(() => import('@/pages/Privacy'));
const Terms = lazyWithRetry(() => import('@/pages/Terms'));
const Cookies = lazyWithRetry(() => import('@/pages/Cookies'));
const Licenses = lazyWithRetry(() => import('@/pages/Licenses'));
const DataDeletion = lazyWithRetry(() => import('@/pages/DataDeletion'));
const Settings = lazyWithRetry(() => import('@/pages/Settings'));
const CollaborationFeed = lazyWithRetry(() => import('@/pages/CollaborationFeed'));
const CreatorCredits = lazyWithRetry(() => import('@/pages/CreatorCredits'));
const LocationDiscovery = lazyWithRetry(() => import('@/pages/LocationDiscovery'));
const Explore = lazyWithRetry(() => import('@/pages/Explore'));
const AdminSupport = lazyWithRetry(() => import('@/pages/AdminSupport'));
const AdminCategories = lazyWithRetry(() => import('@/pages/AdminCategories'));
const Notifications = lazyWithRetry(() => import('@/pages/Notifications'));
const NotificationSettings = lazyWithRetry(() => import('@/pages/NotificationSettings'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>}>
    {children}
  </Suspense>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<SuspenseWrapper><PageTransition><Index /></PageTransition></SuspenseWrapper>} />
        <Route path="/auth" element={<SuspenseWrapper><PageTransition><Auth /></PageTransition></SuspenseWrapper>} />
       <Route path="/auth/callback" element={<SuspenseWrapper><AuthCallback /></SuspenseWrapper>} />
        <Route path="/reset-password" element={<SuspenseWrapper><PageTransition><ResetPassword /></PageTransition></SuspenseWrapper>} />
        <Route path="/force-password-change" element={<SuspenseWrapper><PageTransition><ForcePasswordChange /></PageTransition></SuspenseWrapper>} />
        <Route path="/admin-auth" element={<SuspenseWrapper><PageTransition><AdminAuth /></PageTransition></SuspenseWrapper>} />
        <Route path="/features" element={<SuspenseWrapper><PageTransition><FeaturesPage /></PageTransition></SuspenseWrapper>} />
        <Route path="/how-it-works" element={<SuspenseWrapper><PageTransition><HowItWorksPage /></PageTransition></SuspenseWrapper>} />
        <Route path="/pricing" element={<SuspenseWrapper><PageTransition><Pricing /></PageTransition></SuspenseWrapper>} />
        <Route path="/success-stories" element={<SuspenseWrapper><PageTransition><SuccessStories /></PageTransition></SuspenseWrapper>} />
        <Route path="/about" element={<SuspenseWrapper><PageTransition><About /></PageTransition></SuspenseWrapper>} />
        <Route path="/careers" element={<SuspenseWrapper><PageTransition><Careers /></PageTransition></SuspenseWrapper>} />
        <Route path="/blog" element={<SuspenseWrapper><PageTransition><Blog /></PageTransition></SuspenseWrapper>} />
        <Route path="/blog/how-to-find-a-music-producer" element={<SuspenseWrapper><PageTransition><HowToFindAMusicProducer /></PageTransition></SuspenseWrapper>} />
        <Route path="/contact" element={<SuspenseWrapper><PageTransition><Contact /></PageTransition></SuspenseWrapper>} />
        <Route path="/privacy" element={<SuspenseWrapper><PageTransition><Privacy /></PageTransition></SuspenseWrapper>} />
        <Route path="/terms" element={<SuspenseWrapper><PageTransition><Terms /></PageTransition></SuspenseWrapper>} />
        <Route path="/cookies" element={<SuspenseWrapper><PageTransition><Cookies /></PageTransition></SuspenseWrapper>} />
        <Route path="/licenses" element={<SuspenseWrapper><PageTransition><Licenses /></PageTransition></SuspenseWrapper>} />
        <Route path="/data-deletion" element={<SuspenseWrapper><PageTransition><DataDeletion /></PageTransition></SuspenseWrapper>} />

        {/* Protected Routes */}
        <Route path="/setup-profile" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><SetupProfile /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/discover" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Discover /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/matches" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Matches /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/who-liked-you" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><WhoLikedYou /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/messages/:conversationId" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Messages /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/messages" element={<Navigate to="/matches" replace />} />
        <Route path="/notifications" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Notifications /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/settings/notifications" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><NotificationSettings /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Profile /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/edit-profile" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><EditProfile /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/profile/:userId" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><PublicProfile /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Projects /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/projects/:projectId" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><CollaborationRoom /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/studio/:itemId" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Studio /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/open-projects" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><OpenProjects /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/marketplace" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Marketplace /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/teams" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><TeamManagement /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/api-access" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><ApiAccess /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Jobs /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Settings /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/feed" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><CollaborationFeed /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/credits" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><CreatorCredits /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/explore" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><Explore /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />
        <Route path="/explore/nearby" element={
          <ProtectedRoute><Navbar /><SuspenseWrapper><PageTransition><LocationDiscovery /></PageTransition></SuspenseWrapper></ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
            <SuspenseWrapper><PageTransition><AdminDashboard /></PageTransition></SuspenseWrapper>
          </AdminProtectedRoute>
        } />
        <Route path="/master-admin" element={
          <AdminProtectedRoute allowedRoles={['master_admin', 'super_admin']}>
            <SuspenseWrapper><PageTransition><MasterAdminDashboard /></PageTransition></SuspenseWrapper>
          </AdminProtectedRoute>
        } />
        <Route path="/super-admin" element={
          <AdminProtectedRoute allowedRoles={['super_admin']}>
            <SuspenseWrapper><PageTransition><SuperAdminDashboard /></PageTransition></SuspenseWrapper>
          </AdminProtectedRoute>
        } />
        <Route path="/admin-reports" element={
          <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
            <SuspenseWrapper><PageTransition><AdminReports /></PageTransition></SuspenseWrapper>
          </AdminProtectedRoute>
        } />
        <Route path="/admin-settings" element={
          <AdminProtectedRoute allowedRoles={['super_admin']}>
            <SuspenseWrapper><PageTransition><AdminSettings /></PageTransition></SuspenseWrapper>
          </AdminProtectedRoute>
        } />
        <Route path="/admin-categories" element={
          <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
            <SuspenseWrapper><PageTransition><AdminCategories /></PageTransition></SuspenseWrapper>
          </AdminProtectedRoute>
        } />
        <Route path="/admin-support" element={
          <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
            <SuspenseWrapper><PageTransition><AdminSupport /></PageTransition></SuspenseWrapper>
          </AdminProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<SuspenseWrapper><PageTransition><NotFound /></PageTransition></SuspenseWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};
