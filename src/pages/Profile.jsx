import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Upload, Save, AtSign, Check, X, Edit2, Loader2, AlertCircle } from 'lucide-react';

const Profile = () => {
  const { user, updateAvatar, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await updateAvatar(file);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setPhone(user.phone || '');
    setError('');
    setEditing(false);
  };

  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 overflow-y-auto pt-8">
      <div className="w-full max-w-lg">
        <div className="glass-premium rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 dark:border-gray-800/60">
          {/* Header */}
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="relative group mb-4">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.username}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover ring-4 ring-gray-900/20"
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-black text-white font-bold flex items-center justify-center text-2xl sm:text-3xl uppercase ring-4 ring-gray-900/20">
                  {user?.first_name?.charAt(0)}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="apple-btn apple-btn-icon absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={22} className="animate-spin text-white" />
                ) : (
                  <Upload size={22} className="text-white" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <h1 className="text-lg sm:text-xl font-bold">{user?.first_name} {user?.last_name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
            <span className="mt-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-900/10 text-gray-900 dark:text-gray-100 rounded-lg">
              {user?.role}
            </span>
          </div>

          {/* Profile Fields */}
          <div className="space-y-4">
            {/* Name row */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Full Name</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!editing}
                  placeholder="First"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all ${
                    editing
                      ? 'bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 focus:border-gray-900/40 dark:focus:border-gray-100/40'
                      : 'bg-transparent border border-transparent text-gray-900 dark:text-gray-100'
                  }`}
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!editing}
                  placeholder="Last"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all ${
                    editing
                      ? 'bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 focus:border-gray-900/40 dark:focus:border-gray-100/40'
                      : 'bg-transparent border border-transparent text-gray-900 dark:text-gray-100'
                  }`}
                />
              </div>
            </div>

            {/* Email (readonly) */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Mail size={12} />
                Email
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/40">
                <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>
                <span className="ml-auto px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-200/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 rounded-md">Verified</span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Phone size={12} />
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editing}
                placeholder="+1 (555) 000-0000"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all ${
                  editing
                    ? 'bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 focus:border-gray-900/40 dark:focus:border-gray-100/40'
                    : 'bg-transparent border border-transparent text-gray-900 dark:text-gray-100'
                }`}
              />
            </div>

            {/* Username (readonly) */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <AtSign size={12} />
                Username
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/40">
                <span className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex-1 h-10 rounded-xl bg-gray-100 dark:bg-gray-900/60 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-all flex items-center justify-center gap-1.5"
                >
                  <X size={15} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-black/10 dark:shadow-black/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={15} />
                      Save
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="w-full h-10 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-black/10 dark:shadow-black/30 flex items-center justify-center gap-1.5"
              >
                <Edit2 size={15} />
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-gray-900/10 border border-gray-900/20 text-gray-600 dark:text-gray-400 flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {saved && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Check size={16} />
              Profile updated
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
