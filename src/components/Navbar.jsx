import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  MessageSquareCode, 
  MessageSquare, 
  BookOpen, 
  Bookmark, 
  Terminal, 
  Sun, 
  Moon, 
  LogOut, 
  Code,
  Menu,
  X,
  Heart,
  UserCircle
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activePath = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Chat Room', path: '/chat', icon: MessageSquare },
    { name: 'Dev Rooms', path: '/devrooms', icon: Code },
    { name: 'Blogs', path: '/blogs', icon: BookOpen },
    { name: 'Liked', path: '/liked', icon: Heart },
    { name: 'Saved', path: '/saved', icon: Bookmark },
  ];

  return (
    <nav className="glass-premium sticky top-0 z-50 h-16 w-full flex items-center justify-between px-4 sm:px-6 transition-all duration-300">
      {/* Brand logo */}
      <Link to="/" className="flex items-center gap-2.5 group shrink-0">
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white shadow-lg shadow-gray-900/20 group-hover:scale-105 transition-transform duration-300">
          <MessageSquareCode size={20} className="stroke-[2.5]" />
        </div>
        <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-wide">
          DevRoom
        </span>
      </Link>

      {/* Hamburger (mobile) */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden h-10 w-10 flex items-center justify-center dark:text-gray-300 apple-btn apple-btn-icon"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Nav links (desktop) */}
      <div className="hidden md:flex items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                isActive
                  ? 'dark:text-gray-100 border border-gray-900/10 apple-btn apple-btn-active'
                  : 'dark:text-gray-300 apple-btn apple-btn-ghost'
              }`}
            >
              <Icon size={18} className={isActive ? 'animate-pulse' : ''} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Profile and Settings (desktop) */}
      <div className="hidden md:flex items-center gap-4">
        {user?.role === 'admin' && (
          <Link
            to="/admin/blogs"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-gray-900/30 text-gray-900 hover:bg-gray-900/10 dark:text-gray-100 dark:hover:bg-gray-900/10 apple-btn apple-btn-ghost ${
              activePath.startsWith('/admin') ? 'bg-gray-900/10' : ''
            }`}
          >
            <Terminal size={14} />
            Console
          </Link>
        )}

        <button
          onClick={toggleTheme}
          className="h-10 w-10 flex items-center justify-center dark:text-gray-300 border border-gray-200/20 apple-btn apple-btn-icon"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} className="animate-spin-slow" /> : <Moon size={20} />}
        </button>
      </div>

      {/* Mobile Slide-in Menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-72 max-w-[85vw] glass-premium z-50 shadow-2xl animate-in slide-in-from-right duration-300 md:hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-gray-800/50">
              <span className="text-sm font-bold">Navigation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="h-9 w-9 flex items-center justify-center dark:text-gray-300 apple-btn apple-btn-icon">
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            <div className="p-4 border-b border-gray-200/30 dark:border-gray-800/50">
              <div className="flex items-center gap-3">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="h-10 w-10 rounded-xl object-cover ring-2 ring-gray-900/20" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-black text-white font-bold flex items-center justify-center text-sm uppercase">
                    {user?.first_name?.charAt(0) || user?.username?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10px] text-gray-500">@{user?.username}</p>
                </div>
              </div>
            </div>

            {/* Profile link */}
            <div className="px-3 pt-2 pb-1 border-b border-gray-200/30 dark:border-gray-800/50">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium dark:text-gray-300 apple-btn apple-btn-ghost"
              >
                <UserCircle size={18} />
                Profile
              </Link>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePath.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                      isActive
                        ? 'dark:text-gray-100 apple-btn apple-btn-active'
                        : 'dark:text-gray-300 apple-btn apple-btn-ghost'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}

              {user?.role === 'admin' && (
                <Link
                  to="/admin/blogs"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium mt-2 ${
                    activePath.startsWith('/admin')
                      ? 'dark:text-gray-100 apple-btn apple-btn-active'
                      : 'dark:text-gray-300 apple-btn apple-btn-ghost'
                  }`}
                >
                  <Terminal size={18} />
                  Admin Console
                </Link>
              )}

            </div>

            {/* Bottom actions */}
            <div className="p-4 border-t border-gray-200/30 dark:border-gray-800/50 space-y-3">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium dark:text-gray-300 apple-btn apple-btn-ghost"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 apple-btn apple-btn-danger py-2 text-xs"
              >
                <LogOut size={16} />
                Logout Session
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
