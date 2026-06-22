import React, { useState, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
const ParticleBackground = React.lazy(() => import('../components/ParticleBackground'));
import {
  Search, Star, MessageSquare, Clock, User, ArrowRight, BookOpen,
  Sparkles, Code, PenTool,
  Zap, Globe, Database, Shield, Box
} from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const categoryIcons = {
  'Frontend': Code,
  'Backend': Database,
  'DevOps': Box,
  'AI/ML': Zap,
  'Mobile': Globe,
  'Security': Shield,
  'Design': PenTool,
  'General': BookOpen,
};

const Home = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [blogsRes, catsRes] = await Promise.all([
          axios.get('/api/blogs'),
          axios.get('/api/blogs/categories'),
        ]);
        setBlogs(blogsRes.data);
        setCategories(catsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBlogs = blogs.filter((blog) => {
    const matchesCategory = activeCategory === 'All' || blog.category === activeCategory;
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto w-full">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <Suspense fallback={null}><ParticleBackground /></Suspense>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50 dark:to-gray-950 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-gray-200/50 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Sparkles size={14} className="text-gray-900 dark:text-gray-100" />
            Developer blogs & insights
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-gray-100 dark:via-gray-300 dark:to-gray-500 bg-clip-text text-transparent">
              Explore Engineering Blogs
            </span>
          </h1>

          <p className="text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Technical articles, tutorials, and deep dives from the DevRoom team.
          </p>
        </div>
      </section>

      {/* ===== BLOGS ===== */}
      <section className="px-6 pb-24 -mt-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl text-xs outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors backdrop-blur-xl"
              />
            </div>
            {user?.role === 'admin' && (
              <Link
                to="/write"
                className="apple-btn apple-btn-primary px-4 py-2.5 font-semibold text-xs flex items-center gap-1.5 shrink-0"
              >
                <PenTool size={14} />
                Write
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory('All')}
              className={`apple-btn text-xs font-semibold px-4 py-2 ${
                activeCategory === 'All'
                  ? 'apple-btn-active'
                  : 'apple-btn-ghost'
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const Icon = categoryIcons[cat] || BookOpen;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`apple-btn text-xs font-semibold px-4 py-2 flex items-center gap-1.5 ${
                    isActive
                      ? 'apple-btn-active'
                      : 'apple-btn-ghost'
                  }`}
                >
                  <Icon size={13} />
                  {cat}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
            </div>
          ) : filteredBlogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlogs.map((blog) => (
                <article
                  key={blog.id}
                  className="group flex flex-col rounded-3xl overflow-hidden glass-premium border border-white/20 dark:border-gray-800/60 shadow-md hover:shadow-2xl dark:hover:border-gray-700/60 transition-all duration-500 transform hover:-translate-y-1.5 animate-fade-in"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
                    {blog.cover_image ? (
                      <img
                      src={getImageUrl(blog.cover_image)}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-900/5 to-gray-700/5 flex items-center justify-center">
                        <BookOpen size={44} className="text-gray-900/20 dark:text-gray-100/20" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/60 backdrop-blur-md text-white/90 border border-white/10 flex items-center gap-1">
                      {blog.category || 'General'}
                    </span>
                    {blog.ratings_count > 0 && (
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold bg-black/60 backdrop-blur-md text-white flex items-center gap-1">
                        <Star size={10} className="fill-amber-400 stroke-amber-400" />
                        {blog.rating_avg}
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          @{blog.author_username}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(blog.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors line-clamp-2 leading-snug">
                        {blog.title}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                        {blog.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3.5 border-t border-gray-100 dark:border-gray-800/80">
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <MessageSquare size={13} />
                        {blog.comments_count}
                      </span>
                      <Link
                        to={`/blogs/${blog.id}`}
                        className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 group/link hover:gap-1.5 transition-all"
                      >
                        Read
                        <ArrowRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4 border border-gray-200/50 dark:border-gray-800/50">
                <BookOpen size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No articles found</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-2">
                {activeCategory !== 'All'
                  ? `No articles in "${activeCategory}" yet. Try a different category.`
                  : 'No articles match your search. Try a different keyword.'}
              </p>
              {activeCategory !== 'All' && (
                <button
                  onClick={() => setActiveCategory('All')}
                  className="apple-btn apple-btn-primary mt-4 px-5 py-2 text-xs font-semibold"
                >
                  View all articles
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-gray-200/50 dark:border-gray-800/50 bg-white/30 dark:bg-gray-950/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white">
              <Code size={14} className="stroke-[2.5]" />
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              DevRoom
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} DevRoom.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/blogs" className="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium">Blog</Link>
            <Link to="/chat" className="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium">Chat</Link>
            <Link to="/devrooms" className="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium">DevRooms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
