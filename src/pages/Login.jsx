import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquareCode, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const verifyEmail = location.state?.verifyEmail;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      navigate('/chat');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-gray-950">
      
      {/* Background blobs for login aesthetic */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-gray-900/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-gray-900/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-premium rounded-3xl p-8 shadow-2xl relative z-10 border border-white/20 dark:border-gray-800/60 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white shadow-xl shadow-gray-900/20 mb-4 animate-bounce-slow">
            <MessageSquareCode size={30} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            Welcome back to DevRoom
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            The developer community and chat hub
          </p>
        </div>

        {/* Verification banner */}
        {verifyEmail && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Account created successfully!</p>
              <p className="mt-1">A verification link has been sent to <strong>{verifyEmail}</strong>. Please check your inbox (and spam folder) to verify your email before logging in.</p>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-gray-900/10 border border-gray-900/20 text-gray-600 dark:text-gray-400 flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="developer_joe or joe@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-gray-100 focus:ring-2 focus:ring-gray-900/20 outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-gray-100 focus:ring-2 focus:ring-gray-900/20 outline-none transition-all text-sm"
                required
              />
            </div>
            <div className="text-right mt-2">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 apple-btn apple-btn-gradient font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            ) : (
              <>
                Authenticate Session
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-900 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don't have a DevRoom profile?{' '}
            <Link
              to="/register"
              className="font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 transition-colors"
            >
              Sign Up Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
