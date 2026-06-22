import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { getImageUrl } from '../utils/imageUrl';
import { 
  Heart, 
  Bookmark, 
  Star, 
  MessageSquare, 
  ArrowLeft, 
  CornerDownRight, 
  Send,
  User,
  Clock,
  Edit2,
  Trash2,
  Share2,
  Link as LinkIcon,
  Check
} from 'lucide-react';

const BlogDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Interactions State
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [floatingBookmarks, setFloatingBookmarks] = useState([]);
  let heartId = 0;
  let bookmarkId = 0;
  const [saved, setSaved] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  
  // Rating Hover State
  const [hoverRating, setHoverRating] = useState(0);

  // Comments State
  const [commentText, setCommentText] = useState('');
  const [commentsTree, setCommentsTree] = useState([]);
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', pendingType: '' });

  const handleDeleteBlog = () => {
    setConfirm({ open: true, title: 'Delete Blog', message: 'Are you sure you want to delete this blog post?', pendingType: 'blog' });
  };

  const handleConfirmDelete = async () => {
    setConfirm((prev) => ({ ...prev, open: false }));
    try {
      await axios.delete(`/api/blogs/${id}`);
      navigate('/blogs');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlogDetail = async () => {
    try {
      const response = await axios.get(`/api/blogs/${id}`);
      const data = response.data;
      setBlog(data);
      setCommentsTree(data.comments_tree);
      
      // Load interactions
      setLiked(data.user_interactions.liked);
      setLikesCount(data.likes_count);
      setSaved(data.user_interactions.saved);
      setUserRating(data.user_interactions.rating);
      setAvgRating(data.rating_avg);
      setRatingsCount(data.ratings_count);
    } catch (err) {
      setError("Article not found.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogDetail();
  }, [id]);

  const spawnHearts = useCallback(() => {
    const hearts = [];
    for (let i = 0; i < 5; i++) {
      const id = ++heartId;
      hearts.push({
        id,
        x: Math.random() * 60 - 30,
        delay: Math.random() * 0.15,
        scale: 0.6 + Math.random() * 0.6,
      });
    }
    setFloatingHearts((prev) => [...prev, ...hearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !hearts.find((nh) => nh.id === h.id)));
    }, 900);
  }, []);

  const spawnBookmarks = useCallback(() => {
    const bms = [];
    for (let i = 0; i < 4; i++) {
      bms.push({
        id: ++bookmarkId,
        x: Math.random() * 50 - 25,
        delay: Math.random() * 0.12,
        scale: 0.5 + Math.random() * 0.5,
      });
    }
    setFloatingBookmarks((prev) => [...prev, ...bms]);
    setTimeout(() => {
      setFloatingBookmarks((prev) => prev.filter((b) => !bms.find((nb) => nb.id === b.id)));
    }, 900);
  }, []);

  const handleLike = async () => {
    try {
      const response = await axios.post(`/api/blogs/${id}/like`);
      setLiked(response.data.liked);
      setLikesCount((prev) => (response.data.liked ? prev + 1 : prev - 1));
      if (response.data.liked) spawnHearts();
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`/api/blogs/${id}/save`);
      setSaved(response.data.saved);
      if (response.data.saved) spawnBookmarks();
    } catch (err) {
      console.error("Error toggling save:", err);
    }
  };

  const blogUrl = window.location.href;
  const blogTitle = blog?.title || 'Check out this blog';

  const handleShare = async (platform) => {
    const url = encodeURIComponent(blogUrl);
    const text = encodeURIComponent(blogTitle);

    const shareLinks = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    if (platform === 'native') {
      if (navigator.share) {
        try {
          await navigator.share({ title: blogTitle, url: blogUrl });
          setShowShare(false);
        } catch {}
      }
      return;
    }

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(blogUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
      return;
    }

    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'noopener,noreferrer');
      setShowShare(false);
    }
  };

  const handleRate = async (score) => {
    try {
      const response = await axios.post(`/api/blogs/${id}/rate`, { rating: score });
      setUserRating(response.data.rating);
      setAvgRating(response.data.rating_avg);
      setRatingsCount(response.data.ratings_count);
    } catch (err) {
      console.error("Error submitting rating:", err);
    }
  };

  const handlePostComment = async (e, parentId = null) => {
    e.preventDefault();
    const content = parentId ? replyText.trim() : commentText.trim();
    if (!content) return;

    try {
      const response = await axios.post(`/api/blogs/${id}/comment`, {
        content,
        parent_id: parentId
      });
      
      // Refresh blog detail to rebuild comments tree
      await fetchBlogDetail();
      
      // Clear inputs
      if (parentId) {
        setReplyText('');
        setReplyTargetId(null);
      } else {
        setCommentText('');
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  // Recursive Comment Node Component
  const CommentNode = ({ comment, depth = 0 }) => {
    const isReplying = replyTargetId === comment.id;
    const maxDepth = 4;
    
    return (
      <div className={`${depth > 0 ? 'ml-4 sm:ml-6 mt-4 pl-4 sm:pl-5 border-l-2 border-gray-100 dark:border-gray-800/60' : ''}`}>
        <div className="flex gap-3 items-start group">
          {comment.avatar_url ? (
            <img 
              src={getImageUrl(comment.avatar_url)} 
              alt={comment.username} 
              className="h-8 w-8 rounded-xl object-cover mt-0.5 shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-400 text-white dark:text-gray-900 font-bold flex items-center justify-center text-xs uppercase shrink-0 mt-0.5 shadow-sm">
              {comment.username.charAt(0)}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                @{comment.username}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed">
              {comment.content}
            </p>

            <button
              onClick={() => {
                setReplyTargetId(isReplying ? null : comment.id);
                setReplyText('');
              }}
              className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all"
            >
              <CornerDownRight size={11} />
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
            
            {/* Reply Input Form */}
            {isReplying && (
              <div className="mt-3 p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/50">
                <form onSubmit={(e) => handlePostComment(e, comment.id)} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Reply to @${comment.username}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900/80 border border-gray-200/60 dark:border-gray-700/60 text-xs outline-none focus:border-gray-900/40 dark:focus:border-gray-100/40 transition-all placeholder:text-gray-400"
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="h-9 w-9 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shrink-0"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Recursive Children Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className={depth < maxDepth ? '' : 'ml-4 sm:ml-6 mt-4 pl-4 sm:pl-5 border-l-2 border-gray-100 dark:border-gray-800/60'}>
            {comment.replies.map((reply) => (
              <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <p className="text-gray-500 font-semibold mb-4">{error || "Article not found."}</p>
        <Link to="/blogs" className="apple-btn apple-btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 w-full">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <Link 
          to="/blogs" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to feed
        </Link>

        {/* Article Container */}
        <article className="glass-premium rounded-3xl overflow-hidden border border-white/20 dark:border-gray-800/60 shadow-xl">
          {/* Cover image header */}
          {blog.cover_image && (
            <div className="h-64 md:h-80 overflow-hidden bg-gray-100 dark:bg-gray-900 border-b border-gray-200/30 dark:border-gray-800/50">
              <img src={getImageUrl(blog.cover_image)} alt={blog.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}

          {/* Details wrapper */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Title & Author Meta */}
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug">
                {blog.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <User size={14} />
                    @{blog.author_username}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {new Date(blog.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  {user?.role === 'admin' && (
                    <span className="flex items-center gap-1.5 ml-2 pl-4 border-l border-gray-200 dark:border-gray-700">
                      <Link to="/admin/blogs" className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <Edit2 size={11} /> Edit
                      </Link>
                      <button onClick={handleDeleteBlog} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={11} /> Delete
                      </button>
                    </span>
                  )}
                </div>
                
                {/* User rating */}
                {userRating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={11} className={s <= userRating ? 'fill-amber-400 stroke-amber-400' : 'text-gray-300 dark:text-gray-700'} />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{userRating}/5</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main content body */}
            <div className="text-sm md:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans antialiased pr-2">
              {blog.content}
            </div>

            {/* Interactions Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-b border-gray-100 dark:border-gray-800 py-4 mt-8">
              
              {/* Like / Save toggles */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={handleLike}
                    className={`apple-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold border transition-all duration-200 ${
                      liked 
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50' 
                        : 'apple-btn-ghost border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Heart size={14} className={`transition-all duration-200 ${liked ? 'fill-red-500 text-red-500 scale-110' : ''}`} />
                    <span>{liked ? 'Liked' : 'Like'} ({likesCount})</span>
                  </button>
                  {floatingHearts.map((h) => (
                    <span
                      key={h.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `calc(50% + ${h.x}px)`,
                        top: '50%',
                        '--x': `${h.x}px`,
                        '--delay': `${h.delay}s`,
                        '--scale': h.scale,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="floating-heart"
                        style={{
                          animationDelay: h.delay,
                          transform: `scale(${h.scale})`,
                        }}
                        width="16"
                        height="16"
                        fill="#ef4444"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </span>
                  ))}
                </div>

                <div className="relative">
                  <button
                    onClick={handleSave}
                    className={`apple-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold border transition-all duration-200 ${
                      saved 
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50' 
                        : 'apple-btn-ghost border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Bookmark size={14} className={`transition-all duration-200 ${saved ? 'fill-amber-500 text-amber-500 scale-110' : ''}`} />
                    <span>{saved ? 'Saved' : 'Save'}</span>
                  </button>
                  {floatingBookmarks.map((b) => (
                    <span
                      key={b.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `calc(50% + ${b.x}px)`,
                        top: '50%',
                        '--delay': `${b.delay}s`,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="floating-bookmark"
                        style={{ animationDelay: b.delay, transform: `scale(${b.scale})` }}
                        width="14"
                        height="14"
                        fill="#f59e0b"
                      >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                  ))}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowShare(true)}
                    className="apple-btn apple-btn-ghost border border-gray-200 dark:border-gray-800 flex items-center gap-2 px-4 py-2 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                  >
                    <Share2 size={14} />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Star rating picker */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500">Rate:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating || userRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform hover:scale-110 cursor-pointer"
                        title={`Rate ${star} Stars`}
                      >
                        <Star 
                          size={18} 
                          className={`transition-colors ${
                            isFilled 
                              ? 'fill-amber-400 stroke-amber-400' 
                              : 'text-gray-300 dark:text-gray-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {userRating > 0 && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 ml-1">
                    {userRating}/5
                  </span>
                )}
              </div>
            </div>

            {/* 3. COMMENTS SECTION */}
            <div className="space-y-6 mt-8">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MessageSquare size={18} />
                Discussion ({blog.comments_count})
              </h3>

              {/* Top-level comment composer */}
              <form onSubmit={(e) => handlePostComment(e)} className="flex items-start gap-3">
                {user?.avatar_url ? (
                  <img 
                    src={getImageUrl(user.avatar_url)} 
                    alt={user.username} 
                    className="h-8 w-8 rounded-lg object-cover mt-1"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-gray-900 text-white font-bold flex items-center justify-center text-xs uppercase mt-1">
                    {user?.first_name?.charAt(0)}
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Write a comment, share your technical feedback..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 outline-none text-xs transition-all resize-none"
                    required
                  />
                  <button
                    type="submit"
                    className="apple-btn apple-btn-gradient px-4 py-2 font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Send size={12} />
                    Post Comment
                  </button>
                </div>
              </form>

              {/* Render Comments Tree */}
              <div className="space-y-2.5 pt-4">
                {commentsTree.length > 0 ? (
                  commentsTree.map((comment) => (
                    <CommentNode key={comment.id} comment={comment} depth={0} />
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-6">No discussions yet. Be the first to share comments!</p>
                )}
              </div>
            </div>

          </div>
        </article>

      </div>
      {/* Share Sheet */}
      {showShare && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowShare(false)}
          />
          <div className="relative w-full max-w-sm mx-4 mb-0 sm:mb-0 rounded-3xl rounded-b-none sm:rounded-3xl bg-white/95 dark:bg-[#0e1428]/95 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl dark:shadow-black/60 animate-slide-up">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            <div className="px-6 pb-2 pt-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 text-center">
                Share Article
              </h3>
            </div>

            <div className="px-6 pb-6 pt-4">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { id: 'twitter', icon: 'twitter', label: 'Twitter', color: 'text-[#1DA1F2]', bg: 'bg-[#1DA1F2]/10' },
                  { id: 'facebook', icon: 'facebook', label: 'Facebook', color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10' },
                  { id: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', color: 'text-[#25D366]', bg: 'bg-[#25D366]/10' },
                  { id: 'linkedin', icon: 'linkedin', label: 'LinkedIn', color: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10' },
                ].map((s) => {
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleShare(s.id)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={`h-14 w-14 rounded-2xl ${s.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        {s.icon === 'twitter' ? (
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="#1DA1F2">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        ) : s.icon === 'facebook' ? (
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        ) : s.icon === 'whatsapp' ? (
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        ) : s.icon === 'linkedin' ? (
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="#0A66C2">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        ) : null}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                        {s.label}
                      </span>
                    </button>
                  );
                })}

                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={() => handleShare('native')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Share2 size={24} className="text-gray-600 dark:text-gray-300" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                      More
                    </span>
                  </button>
                )}
              </div>

              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-900/60 hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Link copied!</span>
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Copy link</span>
                    <span className="text-[10px] text-gray-400 ml-auto font-mono truncate max-w-[140px]">
                      {blogUrl}
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setShowShare(false)}
                className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-900/60 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirm((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default BlogDetail;
