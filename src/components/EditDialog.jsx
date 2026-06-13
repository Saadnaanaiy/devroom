import React from 'react';
import { Edit3 } from 'lucide-react';

const FIELDS = {
  blog: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'summary', label: 'Summary', type: 'textarea' },
  ],
  room: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'github_url', label: 'GitHub URL', type: 'text' },
  ],
  user: [
    { key: 'first_name', label: 'First Name', type: 'text' },
    { key: 'last_name', label: 'Last Name', type: 'text' },
    { key: 'username', label: 'Username', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'role', label: 'Role', type: 'select', options: ['user', 'admin'] },
  ],
  channel: [
    { key: 'name', label: 'Channel Name', type: 'text' },
  ],
};

const EditDialog = ({ open, type, data, onDataChange, onSave, onCancel, saving }) => {
  if (!open) return null;

  const fields = FIELDS[type] || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white/90 dark:bg-[#0d1225]/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-black/60 border border-gray-200/60 dark:border-gray-800/60 p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
            <Edit3 size={24} strokeWidth={1.5} className="text-gray-900 dark:text-gray-100" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Edit {type === 'blog' ? 'Blog' : type === 'room' ? 'Dev Room' : type === 'channel' ? 'Channel' : 'User'}
          </h3>
        </div>

        <div className="space-y-3.5 mb-6">
          {fields.map((field) => (
            <div key={field.key} className="text-left">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={data[field.key] || ''}
                  onChange={(e) => onDataChange({ ...data, [field.key]: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 text-sm outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors resize-none"
                  rows={3}
                />
              ) : field.type === 'select' ? (
                <select
                  value={data[field.key] || ''}
                  onChange={(e) => onDataChange({ ...data, [field.key]: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 text-sm outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={data[field.key] || ''}
                  onChange={(e) => onDataChange({ ...data, [field.key]: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 text-sm outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2.5 w-full">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-gray-900 border-t-transparent" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDialog;
