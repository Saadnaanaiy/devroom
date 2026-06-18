import {
  BookOpen,
  Bookmark,
  ChevronUp,
  Code,
  Heart,
  LogOut,
  MessageSquare,
  MessageSquareCode,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Sun,
  Terminal,
  UserCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';


const navItems = [
  { name: 'Chat Room', path: '/chat', icon: MessageSquare },
  { name: 'Dev Rooms', path: '/devrooms', icon: Code },
  { name: 'Blogs', path: '/blogs', icon: BookOpen },
  { name: 'Liked', path: '/liked', icon: Heart },
  { name: 'Saved', path: '/saved', icon: Bookmark },
];

const AppSidebar = ({ defaultCollapsed }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileClosing, setProfileClosing] = useState(false);

  const profileRef = useRef(null);

  const activePath = location.pathname;

  const closeProfile = () => {
    if (!profileOpen || profileClosing) return;
    setProfileClosing(true);
    setTimeout(() => {
      setProfileOpen(false);
      setProfileClosing(false);
    }, 200);
  };

  const toggleProfile = () => {
    if (profileOpen) {
      closeProfile();
    } else {
      setProfileOpen(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        closeProfile();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, profileClosing]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={`flex flex-col border-r border-gray-200/50 dark:border-gray-800/50 bg-white/60 dark:bg-[#0a0e1a]/80 backdrop-blur-xl transition-all duration-300 shrink-0 ${
        collapsed
          ? 'w-14 md:w-16'
          : 'w-52 md:w-64'
      }`}
    >
      {/* Brand */}
      <div
        className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 pt-4 pb-3`}
      >
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 flex items-center justify-center text-white dark:text-gray-900 shadow-md shadow-gray-900/10 dark:shadow-black/20 group-hover:scale-105 transition-transform duration-200">
              <MessageSquareCode size={15} className="stroke-[2.5]" />
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              DevRoom
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Nav links */}
      <div className="flex-1 px-2.5 space-y-0.5 mt-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                collapsed ? 'justify-center px-0 py-2.5 mx-auto w-10 h-10' : 'px-3 py-2.5 w-full'
              } ${
                isActive
                  ? 'text-gray-900 dark:text-white bg-gray-900/8 dark:bg-white/8'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-900/5 dark:hover:bg-white/5'
              }`}
              title={collapsed ? item.name : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gray-900 dark:bg-white" />
              )}
              <Icon size={collapsed ? 20 : 18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}

        {/* Admin Console */}
        {user?.role === 'admin' && (
          <Link
            to="/admin/blogs"
            className={`relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 mt-0.5 ${
              collapsed ? 'justify-center px-0 py-2.5 mx-auto w-10 h-10' : 'px-3 py-2.5 w-full'
            } ${
              activePath.startsWith('/admin')
                ? 'text-gray-900 dark:text-white bg-gray-900/8 dark:bg-white/8'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-900/5 dark:hover:bg-white/5'
            }`}
            title={collapsed ? 'Console' : undefined}
          >
            {activePath.startsWith('/admin') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gray-900 dark:bg-white" />
            )}
            <Terminal size={collapsed ? 20 : 18} className="shrink-0" />
            {!collapsed && <span className="truncate">Console</span>}
          </Link>
        )}
      </div>

      {/* Profile section */}
      <div className="relative" ref={profileRef}>
        <div className="mx-3 mb-1 h-px bg-gradient-to-r from-transparent via-gray-300/40 dark:via-gray-700/40 to-transparent" />
        <div className="p-2 space-y-0.5">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              collapsed ? 'justify-center mx-auto w-10 h-10' : 'w-full px-3 py-2.5'
            } text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-900/5 dark:hover:bg-white/5`}
            title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            {theme === 'dark' ? (
              <Sun size={collapsed ? 20 : 18} className="shrink-0" />
            ) : (
              <Moon size={collapsed ? 20 : 18} className="shrink-0" />
            )}
            {!collapsed && (
              <span className="truncate text-xs">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          {/* Profile button */}
          <button
            onClick={toggleProfile}
            className={`flex items-center gap-2.5 rounded-xl transition-all duration-200 group ${
              collapsed
                ? 'justify-center mx-auto w-10 h-10 p-0'
                : 'w-full p-2 hover:bg-gray-900/5 dark:hover:bg-white/5'
            }`}
            title={collapsed ? `@${user?.username}` : undefined}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.username}
                className="h-8 w-8 rounded-lg object-cover ring-2 ring-gray-900/15 dark:ring-white/15 shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-400 text-white dark:text-gray-900 font-bold flex items-center justify-center text-sm uppercase ring-2 ring-gray-900/15 dark:ring-white/15 shrink-0 shadow-sm">
                {user?.first_name?.charAt(0)}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    @{user?.username}
                  </p>
                </div>
                <ChevronUp
                  size={13}
                  className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ${profileOpen ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>

          {(profileOpen) && (
            <div className={`absolute left-full bottom-0 ml-3 w-56 rounded-2xl bg-white/90 dark:bg-[#0d1225]/90 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-800/60 shadow-2xl dark:shadow-black/40 py-2 z-[100] ${profileClosing ? 'animate-slide-to-sidebar' : 'animate-slide-from-sidebar'}`}>
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-3 h-3 bg-white/90 dark:bg-[#0d1225]/90 border-l border-t border-gray-200/60 dark:border-gray-800/60" />
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800/60">
                <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Signed in as
                </p>
                <p className="text-xs font-semibold truncate mt-0.5 text-gray-900 dark:text-gray-100">
                  {user?.email}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-gray-900/10 dark:bg-white/10 text-gray-900 dark:text-gray-100 rounded-full">
                  {user?.role}
                </span>
              </div>
              <Link
                to="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <UserCircle size={15} className="text-gray-400 dark:text-gray-500" />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default AppSidebar;
