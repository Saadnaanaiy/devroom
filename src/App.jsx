import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

// Lazy-loaded pages
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Blogs = React.lazy(() => import('./pages/Blogs'));
const BlogDetail = React.lazy(() => import('./pages/BlogDetail'));
const SavedBlogs = React.lazy(() => import('./pages/SavedBlogs'));
const LikedBlogs = React.lazy(() => import('./pages/LikedBlogs'));
const Home = React.lazy(() => import('./pages/Home'));
const AdminBlogs = React.lazy(() => import('./pages/AdminBlogs'));
const Profile = React.lazy(() => import('./pages/Profile'));
const DevRooms = React.lazy(() => import('./pages/DevRooms'));
const WriteBlog = React.lazy(() => import('./pages/WriteBlog'));

// Components
import AppSidebar from './components/AppSidebar';

// Route guards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading DevRoom...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }
  
  const isAdmin = isAuthenticated && user?.role === 'admin';
  return isAdmin ? children : <Navigate to="/" replace />;
};

function App() {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');

  return (
    <div className={`h-screen w-screen flex overflow-hidden transition-colors duration-300 ${isDark ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      
      {/* Background Animated Mesh (Sleek Blur Circles for aesthetics) */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-20 dark:opacity-30">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-gray-900/5 blur-[150px] animate-pulse-slow"></div>
          <div className="absolute top-[40%] right-[-10%] h-[500px] w-[500px] rounded-full bg-gray-900/10 blur-[130px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute -bottom-20 left-[20%] h-[400px] w-[400px] rounded-full bg-gray-800/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
        </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 relative">
        {isAuthenticated && <AppSidebar defaultCollapsed={isChatPage} />}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
            </div>
          }>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/devrooms" element={<ProtectedRoute><DevRooms /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/blogs" element={<ProtectedRoute><Blogs /></ProtectedRoute>} />
            <Route path="/blogs/:id" element={<ProtectedRoute><BlogDetail /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><SavedBlogs /></ProtectedRoute>} />
            <Route path="/liked" element={<ProtectedRoute><LikedBlogs /></ProtectedRoute>} />
            <Route path="/write" element={<AdminRoute><WriteBlog /></AdminRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin/blogs" element={<AdminRoute><AdminBlogs /></AdminRoute>} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default App;
