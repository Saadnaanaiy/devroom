import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen, ChevronRight, ChevronLeft, Check,
  FileText, AlignLeft, Send, Sparkles, X, Upload,
  Eye, Type, Hash, ImageIcon
} from 'lucide-react';

const STEPS = [
  { num: 1, title: 'Title & Category', icon: Type, desc: 'Give your blog a catchy title and pick a category' },
  { num: 2, title: 'Summary', icon: AlignLeft, desc: 'Write a short overview to hook your readers' },
  { num: 3, title: 'Content', icon: FileText, desc: 'Write the full blog article with markdown' },
  { num: 4, title: 'Cover & Review', icon: Eye, desc: 'Add a cover image and preview before publishing' },
];

const CATEGORIES = [
  'General', 'Frontend', 'Backend', 'DevOps', 'AI/ML', 'Mobile', 'Security', 'Design'
];

const WriteBlog = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const contentRef = useRef(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [coverPreview, setCoverPreview] = useState(null);
  const [animDir, setAnimDir] = useState('next');

  const [form, setForm] = useState({
    title: '',
    category: 'General',
    summary: '',
    content: '',
    cover_image: null,
    cover_url: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const goTo = (next) => {
    setAnimDir(next > step ? 'next' : 'prev');
    setTimeout(() => {
      setStep(next);
      const el = contentRef.current;
      if (el) {
        el.style.transition = 'none';
        el.style.transform = next > step ? 'translateX(40px)' : 'translateX(-40px)';
        el.style.opacity = '0';
        requestAnimationFrame(() => {
          el.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          el.style.transform = 'translateX(0)';
          el.style.opacity = '1';
        });
      }
    }, 50);
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.transform = 'translateX(0)';
      contentRef.current.style.opacity = '1';
    }
  }, [step]);

  const canProceed = () => {
    switch (step) {
      case 1: return form.title.trim().length >= 3;
      case 2: return form.summary.trim().length >= 10;
      case 3: return form.content.trim().length >= 20;
      default: return true;
    }
  };

  const handleCoverFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      update('cover_image', file);
      update('cover_url', '');
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeCover = () => {
    update('cover_image', null);
    update('cover_url', '');
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('category', form.category);
      formData.append('summary', form.summary.trim());
      formData.append('content', form.content.trim());

      if (form.cover_image) {
        formData.append('cover_image', form.cover_image);
      } else if (form.cover_url.trim()) {
        formData.append('cover_image', form.cover_url.trim());
      }

      await axios.post('/api/blogs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/blogs');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create blog. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepInfo = STEPS[step - 1];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10 w-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-400 flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-black/30">
              <BookOpen size={20} className="text-white dark:text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                Write Blog
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Share your knowledge with the DevRoom community
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/blogs')}
            className="apple-btn apple-btn-ghost text-xs px-4 py-2"
          >
            Cancel
          </button>
        </div>

        <div className="flex gap-8">
          {/* Step Sidebar */}
          <div className="hidden lg:flex flex-col gap-0 w-56 shrink-0 pt-2">
            {STEPS.map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              const Icon = s.icon;
              return (
                <button
                  key={s.num}
                  onClick={() => {
                    if (s.num < step || canProceed()) goTo(s.num);
                  }}
                  disabled={s.num > step && !canProceed()}
                  className={`relative flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gray-100 dark:bg-gray-900/60'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                  } ${s.num > step && !canProceed() ? 'opacity-40' : ''}`}
                >
                  {isCurrent && (
                    <div className="absolute left-0 top-3.5 bottom-3.5 w-0.5 bg-gray-900 dark:bg-gray-100 rounded-full" />
                  )}
                  <div
                    className={`relative h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isCompleted
                        ? 'bg-gray-900 dark:bg-white'
                        : isCurrent
                        ? 'bg-gray-900 dark:bg-white shadow-lg shadow-black/10 dark:shadow-black/30'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} className="text-white dark:text-gray-900 stroke-[2.5]" />
                    ) : (
                      <Icon size={16} className={isCurrent ? 'text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-500'} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold leading-tight mb-0.5 ${
                      isCurrent ? 'text-gray-900 dark:text-gray-100' : isCompleted ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      Step {s.num}
                    </p>
                    <p className={`text-[10px] leading-tight ${
                      isCurrent ? 'text-gray-500 dark:text-gray-400' : isCompleted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-300 dark:text-gray-600'
                    }`}>
                      {s.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Step Indicator (Mobile) */}
            <div className="lg:hidden mb-8">
              <div className="flex items-center justify-between relative mb-6">
                <div className="absolute top-3.5 left-4 right-4 h-[2px] bg-gray-200 dark:bg-gray-800 -z-10" />
                <div
                  className="absolute top-3.5 left-4 h-[2px] bg-gray-900 dark:bg-gray-100 -z-10 transition-all duration-500 ease-out"
                  style={{ width: `calc(((${step - 1} / ${STEPS.length - 1}) * 100%) - 0rem)` }}
                />
                {STEPS.map((s) => {
                  const isCompleted = step > s.num;
                  const isCurrent = step === s.num;
                  const Icon = s.icon;
                  return (
                    <div key={s.num} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isCompleted
                            ? 'bg-gray-900 dark:bg-white'
                            : isCurrent
                            ? 'bg-gray-900 dark:bg-white scale-110 shadow-lg'
                            : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      >
                        {isCompleted ? (
                          <Check size={12} className="text-white dark:text-gray-900 stroke-[3]" />
                        ) : (
                          <Icon size={12} className={isCurrent ? 'text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-600'} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Step {step}: {stepInfo.title}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{stepInfo.desc}</p>
              </div>
            </div>

            {/* Step Header (Desktop) */}
            <div className="hidden lg:block mb-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Step {step} of {STEPS.length}
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                {stepInfo.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stepInfo.desc}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 px-4 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/50 dark:border-red-800/50 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-2.5 animate-fade-in">
                <div className="h-6 w-6 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                  <X size={12} className="text-red-500" />
                </div>
                {error}
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white/80 dark:bg-[#0c1225]/80 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-xl dark:shadow-black/40 p-6 sm:p-8">
              <div ref={contentRef} className="transition-all duration-400" style={{ opacity: 1, transform: 'translateX(0)' }}>
                {/* STEP 1: Title & Category */}
                {step === 1 && (
                  <div className="space-y-7">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2.5 flex items-center gap-2">
                        <Type size={14} className="text-gray-400" />
                        Blog Title
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => update('title', e.target.value)}
                        placeholder="e.g. Building Scalable APIs with Flask"
                        className="w-full px-4 py-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm font-medium outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all duration-200 placeholder:text-gray-400"
                        autoFocus
                      />
                      <div className="flex items-center justify-between mt-2 px-1">
                        <span className="text-[11px] text-gray-400">
                          {form.title.length} characters
                        </span>
                        <span className={`text-[11px] font-medium transition-colors ${
                          form.title.trim().length >= 3 || form.title.length === 0
                            ? 'text-emerald-500'
                            : 'text-amber-500'
                        }`}>
                          {form.title.trim().length >= 3 ? '✓ Good title' : form.title.length > 0 ? 'Min 3 characters' : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2.5 flex items-center gap-2">
                        <Hash size={14} className="text-gray-400" />
                        Category
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => update('category', cat)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                              form.category === cat
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md shadow-black/10 dark:shadow-black/20 scale-105'
                                : 'bg-gray-100/80 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/60 hover:scale-[1.02] border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Summary */}
                {step === 2 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2.5 flex items-center gap-2">
                      <AlignLeft size={14} className="text-gray-400" />
                      Blog Summary
                    </label>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed ml-6">
                      Write a brief overview that readers will see in the blog cards. Make it compelling — this is the first thing people read.
                    </p>
                    <textarea
                      value={form.summary}
                      onChange={(e) => update('summary', e.target.value)}
                      placeholder="A concise description of what this blog covers..."
                      rows={7}
                      className="w-full px-4 py-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-sm font-medium outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all duration-200 placeholder:text-gray-400 resize-none leading-relaxed"
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[11px] text-gray-400">
                        {form.summary.length} characters
                      </span>
                      <span className={`text-[11px] font-medium transition-colors ${
                        form.summary.trim().length >= 10 || form.summary.length === 0
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}>
                        {form.summary.trim().length >= 10 ? '✓ Great summary' : form.summary.length > 0 ? 'Min 10 characters' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 3: Content */}
                {step === 3 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        Blog Content
                      </label>
                      <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg font-medium">
                        Markdown supported
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed ml-6">
                      Write your full blog article. Use markdown for headings, code blocks, lists, and more.
                    </p>
                    <textarea
                      value={form.content}
                      onChange={(e) => update('content', e.target.value)}
                      placeholder={`# Your Heading Here\n\nStart writing your blog content...\n\n\`\`\`python\nprint("Hello, DevRoom!")\n\`\`\``}
                      rows={16}
                      className="w-full px-4 py-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-950/80 border border-gray-200/60 dark:border-gray-800/60 text-sm outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 focus:bg-white dark:focus:bg-gray-900/80 transition-all duration-200 placeholder:text-gray-400 resize-none leading-relaxed font-mono text-[13px]"
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[11px] text-gray-400">
                        {form.content.length} characters
                      </span>
                      <span className={`text-[11px] font-medium transition-colors ${
                        form.content.trim().length >= 20 || form.content.length === 0
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}>
                        {form.content.trim().length >= 20 ? '✓ Looking good' : form.content.length > 0 ? 'Min 20 characters' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 4: Cover & Review */}
                {step === 4 && (
                  <div className="space-y-7">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2.5 flex items-center gap-2">
                        <ImageIcon size={14} className="text-gray-400" />
                        Cover Image
                      </label>
                      {coverPreview ? (
                        <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 group">
                          <img src={coverPreview} alt="Cover preview" className="w-full h-52 object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button
                            onClick={removeCover}
                            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-3 px-4 py-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100/50 dark:hover:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group"
                          >
                            <Upload size={22} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">Upload Image</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, GIF up to 5MB</p>
                            </div>
                          </button>
                          <div className="flex sm:flex-col items-center gap-2 px-2">
                            <div className="h-px sm:h-8 w-8 sm:w-px bg-gray-200 dark:bg-gray-800" />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Or</span>
                            <div className="h-px sm:h-8 w-8 sm:w-px bg-gray-200 dark:bg-gray-800" />
                          </div>
                          <input
                            type="text"
                            value={form.cover_url}
                            onChange={(e) => {
                              update('cover_url', e.target.value);
                              update('cover_image', null);
                              setCoverPreview(null);
                            }}
                            placeholder="Paste image URL..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-xs outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 transition-all"
                          />
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFile}
                        className="hidden"
                      />
                    </div>

                    {/* Preview Card */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Eye size={14} className="text-gray-400" />
                        Preview
                      </label>
                      <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                        {coverPreview && (
                          <img src={coverPreview} alt="" className="w-full h-44 object-cover" />
                        )}
                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-900/10 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50">
                              {form.category}
                            </span>
                          </div>
                          <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 leading-snug">
                            {form.title || 'Untitled Blog'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                            {form.summary || 'No summary written yet.'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium pt-2 border-t border-gray-100 dark:border-gray-800">
                            <Sparkles size={14} className="text-emerald-500" />
                            Ready to publish
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-800/50">
                <div>
                  {step > 1 ? (
                    <button
                      onClick={() => goTo(step - 1)}
                      disabled={submitting}
                      className="apple-btn bg-gray-100/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/60 px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ChevronLeft size={14} />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  {STEPS.map((s) => (
                    <div
                      key={s.num}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        s.num === step
                          ? 'w-8 bg-gray-900 dark:bg-gray-100'
                          : s.num < step
                          ? 'w-2 bg-gray-400 dark:bg-gray-500'
                          : 'w-2 bg-gray-200 dark:bg-gray-800'
                      }`}
                    />
                  ))}
                </div>

                <div>
                  {step < STEPS.length ? (
                    <button
                      onClick={() => goTo(step + 1)}
                      disabled={!canProceed()}
                      className="apple-btn bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 px-6 py-2.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 shadow-lg shadow-black/10 dark:shadow-black/30"
                    >
                      Continue
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !canProceed()}
                      className="apple-btn bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 px-7 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-black/10 dark:shadow-black/30 hover:shadow-xl transition-all disabled:opacity-40"
                    >
                      {submitting ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white dark:border-gray-900 border-t-transparent" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Publish Blog
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WriteBlog;
