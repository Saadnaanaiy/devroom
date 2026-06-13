import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MessageSquareCode, Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await axios.post(`/api/auth/reset-password/${token}`, { password });
      setSuccess(res.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-gray-900/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-gray-900/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-premium rounded-3xl p-8 shadow-2xl relative z-10 border border-white/20 dark:border-gray-800/60 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white shadow-xl shadow-gray-900/20 mb-4">
            <MessageSquareCode size={30} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            Set new password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Choose a strong password for your account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-gray-900/10 border border-gray-900/20 text-gray-600 dark:text-gray-400 flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-gray-900/10 border border-gray-900/20 text-gray-600 dark:text-gray-400 flex items-start gap-3 text-sm">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <p>{success} Redirecting to login...</p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-2xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-gray-100 focus:ring-2 focus:ring-gray-900/20 outline-none transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-gray-100 focus:ring-2 focus:ring-gray-900/20 outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 apple-btn apple-btn-gradient font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-900 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
