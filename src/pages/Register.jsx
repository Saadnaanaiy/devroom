import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquareCode, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Lock, 
  UploadCloud, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Terminal
} from 'lucide-react';

const PWD_ITEMS = [
  { key: 'length', label: '8+ characters' },
  { key: 'number', label: 'Contains number' },
  { key: 'lowercase', label: 'Lowercase letter' },
  { key: 'uppercase', label: 'Uppercase letter' },
  { key: 'special', label: 'Special symbol (!@#$...)' },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  
  // Avatar uploading
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showAvatar, setShowAvatar] = useState(false);

  // Password Validation Checklist
  const [pwdCriteria, setPwdCriteria] = useState({
    length: false,
    number: false,
    lowercase: false,
    uppercase: false,
    special: false
  });
  const [pwdScore, setPwdScore] = useState(0);

  useEffect(() => {
    const checkPasswordStrength = () => {
      const criteria = {
        length: password.length >= 8,
        number: /[0-9]/.test(password),
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
      };

      setPwdCriteria(criteria);

      // Calculate score
      let score = 0;
      if (criteria.length) score += 1;
      if (criteria.number) score += 1;
      if (criteria.lowercase) score += 1;
      if (criteria.uppercase) score += 1;
      if (criteria.special) score += 1;
      setPwdScore(score);
    };

    checkPasswordStrength();
  }, [password]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("File size must be under 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setError("First name and Last name are required.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!email.trim() || !phone.trim()) {
        setError("Email and Phone are required.");
        return;
      }
      // Simple Email Check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!username.trim() || !password) {
        setError("Username and Password are required.");
        return;
      }
      if (pwdScore < 3) {
        setError("Please choose a stronger password.");
        return;
      }
      // Step 3 is now the final step — submit directly
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (step !== 3) return;
    
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('username', username.trim());
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('first_name', firstName.trim());
    formData.append('last_name', lastName.trim());
    formData.append('phone', phone.trim());
    if (adminKey.trim()) {
      formData.append('admin_key', adminKey.trim());
    }
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      const res = await axios.post('/api/auth/register', formData);
      navigate('/login', { state: { verifyEmail: res.data.user?.email || email.trim() } });
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Try again.";
      setError(msg);
      if (msg.includes("registered") || msg.includes("username") || msg.includes("Email")) {
        setStep(3);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get color for password strength indicator
  const getStrengthColor = () => {
    if (pwdScore <= 1) return 'bg-red-400';
    if (pwdScore <= 3) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (password.length === 0) return '';
    if (pwdScore <= 1) return 'Weak';
    if (pwdScore <= 3) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-[#0b1020]">
      
      {/* Background blobs */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/3 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-indigo-500/3 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-white/80 dark:bg-[#0c1225]/80 backdrop-blur-2xl rounded-3xl p-8 shadow-xl dark:shadow-black/40 relative z-10 border border-gray-200/50 dark:border-gray-800/50 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-7 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-400 flex items-center justify-center text-white dark:text-gray-900 shadow-lg shadow-black/10 dark:shadow-black/30 mb-4">
            <MessageSquareCode size={26} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Join DevRoom
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Set up your developer profile
          </p>
        </div>

        {/* Multi-step progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xs mx-auto relative">
            <div className="absolute top-3.5 left-4 right-4 h-[2px] bg-gray-200 dark:bg-gray-800 -z-10" />
            <div
              className="absolute top-3.5 left-4 h-[2px] bg-gray-900 dark:bg-gray-100 -z-10 transition-all duration-500 ease-out"
              style={{ width: `calc(((${step - 1} / 2) * 100%) - 0rem)` }}
            />
            {[1, 2, 3].map((num) => {
              const isCompleted = step > num;
              const isCurrent = step === num;
              return (
                <div key={num} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`relative h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      isCompleted
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : isCurrent
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 scale-110 shadow-lg shadow-black/10 dark:shadow-black/30'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={12} className="stroke-[3]" />
                    ) : (
                      num
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-4">
            <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100">
              {step === 1 && "Personal Info"}
              {step === 2 && "Contact"}
              {step === 3 && "Credentials"}
            </span>
            <span className="text-[11px] text-gray-400 ml-2 font-medium">
              — Step {step} of 3
            </span>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 px-4 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/50 dark:border-red-800/50 text-xs font-medium text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Multi-Step Forms */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* STEP 1: Bio Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all"
                    required
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Contacts */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joe@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 3: Security & Credentials */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <UserIcon size={14} className="text-gray-400" />
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="dev_joe"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Lock size={14} className="text-gray-400" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-500 dark:text-gray-400">Password strength</span>
                    <span className={`${pwdScore <= 1 ? 'text-red-400' : pwdScore <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getStrengthColor()}`}
                      style={{ width: `${(pwdScore / 5) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PWD_ITEMS.map((item) => {
                      const met = pwdCriteria[item.key];
                      return (
                        <div key={item.key} className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            met ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-200 dark:bg-gray-800'
                          }`}>
                            {met ? (
                              <Check size={9} className="text-emerald-500 stroke-[3]" />
                            ) : (
                              <X size={9} className="text-gray-400 stroke-[3]" />
                            )}
                          </div>
                          <span className={`text-[10px] ${met ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400'}`}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Terminal size={14} className="text-gray-400" />
                  Admin Key <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key for elevated access"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all"
                />
              </div>

              {/* Avatar upload — collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAvatar(!showAvatar)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <UploadCloud size={14} />
                  {showAvatar ? 'Hide' : 'Add'} profile photo
                  <span className="text-gray-400 font-normal">(optional)</span>
                </button>

                {showAvatar && (
                  <div className="mt-3 flex flex-col items-center gap-3 p-4 rounded-xl bg-gray-50/60 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/50">
                    <label className="relative h-24 w-24 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden group hover:border-gray-900/40 dark:hover:border-gray-100/40 hover:bg-gray-100 dark:hover:bg-gray-900/80 transition-all cursor-pointer">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <UploadCloud size={28} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all" />
                      )}
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </label>
                    <p className="text-[10px] text-gray-400 text-center">Max 2MB, JPG/PNG/GIF</p>
                    {avatarPreview && (
                      <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(''); }} className="text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors">
                        Remove photo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-800/60">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 h-11 rounded-xl bg-gray-100 dark:bg-gray-900/60 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={15} />
                Back
              </button>
            )}
            
            <button
              type={step < 3 ? 'button' : 'submit'}
              onClick={step < 3 ? handleNextStep : undefined}
              disabled={loading}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                step < 3
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg shadow-black/10 dark:shadow-black/30'
                  : 'bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 shadow-lg shadow-black/10 dark:shadow-black/30'
              } disabled:opacity-50`}
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-gray-900 border-t-transparent" />
              ) : step < 3 ? (
                <>
                  Continue
                  <ArrowRight size={15} />
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have a DevRoom profile?{' '}
            <Link
              to="/login"
              className="font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
