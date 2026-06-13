import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, Star, MessageSquare, Clock, User, ArrowRight, BookOpen } from 'lucide-react';

const Blogs = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await axios.get('/api/blogs');
        setBlogs(response.data);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Developer Insights
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              Read technical articles, blogs, and tutorials posted by the DevRoom engineering admins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl text-xs outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            {/* Write Blog button for admin */}
            {user?.role === 'admin' && (
              <Link
                to="/write"
                className="apple-btn apple-btn-gradient px-4 py-2.5 font-semibold text-xs flex items-center gap-1.5 shrink-0"
              >
                <BookOpen size={14} />
                Write Blog
              </Link>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
          </div>
        ) : filteredBlogs.length > 0 ? (
          /* Blogs Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <article 
                key={blog.id} 
                className="group flex flex-col rounded-3xl overflow-hidden glass-premium border border-white/20 dark:border-gray-800/60 shadow-md hover:shadow-xl dark:hover:border-gray-900/30 transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
                  {blog.cover_image ? (
                    <img 
                      src={blog.cover_image} 
                      alt={blog.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-900/10 to-gray-700/10 flex items-center justify-center text-gray-900 dark:text-gray-100">
                      <BookOpen size={40} className="opacity-40" />
                    </div>
                  )}
                  {/* Rating tag */}
                  {blog.ratings_count > 0 && (
                    <span className="absolute top-4 right-4 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-black/60 backdrop-blur-md text-white flex items-center gap-1">
                      <Star size={10} className="fill-amber-400 stroke-amber-400" />
                      {blog.rating_avg} ({blog.ratings_count})
                    </span>
                  )}
                </div>

                {/* Article Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Meta details */}
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
                    {/* Title */}
                    <h2 className="text-base font-bold group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors line-clamp-2">
                      {blog.title}
                    </h2>
                    {/* Summary */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                      {blog.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MessageSquare size={13} />
                      {blog.comments_count} Comments
                    </span>
                    <Link
                      to={`/blogs/${blog.id}`}
                      className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 group-hover:gap-1.5 transition-all"
                    >
                      Read Article
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* No blogs state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gray-900/10 text-gray-900 flex items-center justify-center mb-4">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-bold">No articles match your query</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-2">
              Try searching for something else or wait for admins to post new material.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blogs;
