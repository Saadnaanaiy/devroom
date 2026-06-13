import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const CONFETTI_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const confettiRef = useRef(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(`/api/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    };
    verify();
  }, [token]);

  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      navigate('/login');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, navigate]);

  // Confetti particles
  useEffect(() => {
    if (status !== 'success' || !confettiRef.current) return;
    const container = confettiRef.current;
    const particles = [];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-particle';
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      el.style.animationDelay = `${Math.random() * 2}s`;
      el.style.animationDuration = `${2 + Math.random() * 2}s`;
      el.style.width = `${6 + Math.random() * 6}px`;
      el.style.height = `${6 + Math.random() * 6}px`;
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(el);
      particles.push(el);
    }
    return () => particles.forEach(el => el.remove());
  }, [status]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-[#0b1020]">

      {/* Background blobs */}
      {status === 'success' && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/4 blur-[180px] pointer-events-none animate-pulse-slow" />
          <div className="absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-emerald-400/3 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-blue-400/3 blur-[120px] pointer-events-none" />
        </>
      )}
      {status === 'error' && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-red-500/4 blur-[150px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-amber-500/3 blur-[120px] pointer-events-none" />
        </>
      )}
      {status === 'loading' && (
        <>
          <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/4 blur-[150px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-indigo-500/3 blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Confetti container */}
      {status === 'success' && (
        <div ref={confettiRef} className="absolute inset-0 pointer-events-none overflow-hidden" />
      )}

      <div className="w-full max-w-md bg-white/80 dark:bg-[#0c1225]/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-black/40 relative z-10 border border-gray-200/50 dark:border-gray-800/50 animate-fade-in">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-400 flex items-center justify-center text-white dark:text-gray-900 shadow-lg shadow-black/10 dark:shadow-black/30">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            {/* Animated bracket icon */}
            <div className="relative mb-8">
              <div className="h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-blue-200/30 dark:border-blue-500/10" />
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-400 dark:border-t-blue-400 animate-spin" style={{ animationDuration: '1.2s' }} />
                <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-t-indigo-400 dark:border-t-indigo-400 animate-spin" style={{ animationDuration: '1.8s', animationDirection: 'reverse' }} />
                <svg className="h-10 w-10 text-blue-500 dark:text-blue-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Verifying your email
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-[260px] leading-relaxed">
              Please wait while we confirm your account...
            </p>

            {/* Shimmer bar */}
            <div className="mt-8 w-48 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-gray-900/30 dark:via-gray-100/30 to-transparent rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>

            {/* Pulsing dots */}
            <div className="flex gap-2 mt-6">
              <span className="h-2 w-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce" style={{ animationDelay: '0s', animationDuration: '1s' }} />
              <span className="h-2 w-2 rounded-full bg-indigo-400 dark:bg-indigo-500 animate-bounce" style={{ animationDelay: '0.15s', animationDuration: '1s' }} />
              <span className="h-2 w-2 rounded-full bg-violet-400 dark:bg-violet-500 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '1s' }} />
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="flex flex-col items-center py-4">
            {/* Animated checkmark */}
            <div className="relative mb-7">
              <div className="h-24 w-24 rounded-full bg-emerald-50 dark:bg-emerald-900/15 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-emerald-200/40 dark:border-emerald-500/10" />
                <div className="absolute inset-0 rounded-full bg-emerald-400/5 dark:bg-emerald-400/5 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <svg className="h-12 w-12 text-emerald-500 dark:text-emerald-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" className="animate-[draw-check_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]" strokeDasharray="30" strokeDashoffset="30" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-scale-in">
                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 mb-4 animate-scale-in">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Verified
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 animate-fade-in">
              Email Verified
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed text-center animate-fade-in">
              {message || 'Your email has been confirmed. You can now log in and start using DevRoom.'}
            </p>

            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-black/10 dark:shadow-black/30 active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Go to Login
              <span className="text-[11px] opacity-60 font-mono ml-1">({countdown}s)</span>
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center py-4">
            {/* Animated X icon */}
            <div className="relative mb-7">
              <div className="h-24 w-24 rounded-full bg-red-50 dark:bg-red-900/15 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-red-200/40 dark:border-red-500/10" />
                <svg className="h-12 w-12 text-red-400 dark:text-red-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Failed
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
              Verification Failed
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed text-center">
              {message}
            </p>

            <div className="flex flex-col gap-3 w-full max-w-[220px]">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-black/10 dark:shadow-black/30 active:scale-[0.97]"
              >
                Back to Login
              </Link>
              <button
                onClick={() => window.location.href = 'mailto:support@devroom.com'}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors font-medium py-1"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-tr from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-400 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="dark:hidden">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="hidden dark:block">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-gray-400">
              DevRoom
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
