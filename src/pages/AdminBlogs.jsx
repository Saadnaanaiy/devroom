import React, { useState, useEffect, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import EditDialog from '../components/EditDialog';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { PenSquare, Eye, UploadCloud, Edit, Trash2, Plus, Check, BookOpen, X, AlertCircle, Users, MessageSquare, Hash, Code, Activity, ExternalLink, GitBranch, Globe, Calendar, LogIn, UserPlus, MessageCircle, Layout, TrendingUp, BarChart3, Clock, Save, UserCheck, UserX, Shield, ShieldOff } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import AdminConsole from './AdminConsole';

const COLORS = ['#737373', '#a3a3a3', '#525252', '#404040', '#808080', '#595959'];

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  const mainColor = payload[0]?.color || '#3b82f6';
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden" style={{ minWidth: 130 }}>
      <div className="px-3.5 py-2" style={{ background: `linear-gradient(135deg, ${mainColor}10, ${mainColor}05)` }}>
        <p className="text-[11px] font-bold tracking-wider text-gray-500">{label}</p>
      </div>
      <div className="px-3.5 py-2.5 space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <span style={{ color: entry.color }}>●</span>
              {entry.name}
            </span>
            <span className="text-sm font-bold" style={{ color: entry.color }}>
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ACTION_ICONS = {
  register: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Registered' },
  login: { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-500/10', label: 'Logged in' },
  create_blog: { icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-500/10', label: 'Created blog' },
  comment: { icon: MessageCircle, color: 'text-cyan-600', bg: 'bg-cyan-500/10', label: 'Commented' },
  send_message: { icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-500/10', label: 'Sent message' },
  create_channel: { icon: Hash, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Created channel' },
  update_channel: { icon: Edit, color: 'text-yellow-600', bg: 'bg-yellow-500/10', label: 'Renamed channel' },
  delete_channel: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-500/10', label: 'Deleted channel' },
  create_dev_room: { icon: Code, color: 'text-purple-600', bg: 'bg-purple-500/10', label: 'Created dev room' },
  delete_dev_room: { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-500/10', label: 'Deleted dev room' },
  update_dev_room: { icon: Edit, color: 'text-sky-600', bg: 'bg-sky-500/10', label: 'Updated dev room' },
};

const ActivityItem = ({ log, socketActivity }) => {
  const action = log?.action || socketActivity?.action;
  const info = ACTION_ICONS[action] || { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-500/10', label: action };
  const Icon = info.icon;
  const username = log?.username || socketActivity?.username || 'system';
  const details = log?.details || socketActivity?.details || '';
  const time = log?.created_at
    ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : socketActivity?.time || '';
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
      <div className={`h-8 w-8 rounded-lg ${info.bg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={info.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs">
          <span className="font-semibold">{username}</span>{' '}
          <span className="text-gray-500">{info.label}</span>
        </p>
        {details && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{details}</p>}
      </div>
      <span className="text-[10px] text-gray-400 font-mono shrink-0">{time}</span>
    </div>
  );
};

const AdminBlogs = () => {
  const { socket, isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState('overview');

  // Stats
  const [stats, setStats] = useState(null);
  const [recentRooms, setRecentRooms] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  // Trends
  const [trends, setTrends] = useState(null);

  // Activity
  const [activityLog, setActivityLog] = useState([]);

  // Blogs
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dev Rooms
  const [rooms, setRooms] = useState([]);

  // Users management
  const [allUsers, setAllUsers] = useState([]);

  // Channels management
  const [allChannels, setAllChannels] = useState([]);

  // Confirm dialog
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', pendingType: '', pendingId: null });

  // Edit dialog
  const [editDialog, setEditDialog] = useState({ open: false, type: '', data: {}, id: null, saving: false });

  const handleConfirm = async () => {
    const { pendingType, pendingId } = confirm;
    setConfirm((prev) => ({ ...prev, open: false }));
    try {
      if (pendingType === 'blog') {
        await axios.delete(`/api/blogs/${pendingId}`);
        setBlogs((prev) => prev.filter((b) => b.id !== pendingId));
      } else if (pendingType === 'room') {
        await axios.delete(`/api/devrooms/${pendingId}`);
        setRooms((prev) => prev.filter((r) => r.id !== pendingId));
      } else if (pendingType === 'user') {
        await axios.delete(`/api/admin/users/${pendingId}`);
        setAllUsers((prev) => prev.filter((u) => u.id !== pendingId));
      } else if (pendingType === 'channel') {
        await axios.delete(`/api/chat/rooms/${pendingId}`);
        setAllChannels((prev) => prev.filter((ch) => ch.id !== pendingId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/users');
      setAllUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAllChannels = useCallback(async () => {
    try {
      const res = await axios.get('/api/chat/rooms');
      setAllChannels(res.data.channels || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, blogsRes, roomsRes, trendsRes, activityRes] = await Promise.all([
          axios.get('/api/admin/stats'),
          axios.get('/api/blogs'),
          axios.get('/api/devrooms'),
          axios.get('/api/admin/trends'),
          axios.get('/api/admin/activity-log')
        ]);
        setStats(statsRes.data.stats);
        setRecentRooms(statsRes.data.recent_rooms || []);
        setRecentUsers(statsRes.data.recent_users || []);
        setBlogs(blogsRes.data);
        setRooms(roomsRes.data);
        setTrends(trendsRes.data);
        setActivityLog(activityRes.data || []);
        fetchAllUsers();
        fetchAllChannels();
      } catch (err) {
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchAllUsers, fetchAllChannels]);

  // Listen for live admin events
  useEffect(() => {
    if (!socket) return;
    const handleAdminEvent = (data) => {
      if (data.type === 'dev_room_created') {
        setRooms((prev) => [data.room, ...prev]);
      }
    };
    socket.on('admin_event', handleAdminEvent);
    return () => socket.off('admin_event', handleAdminEvent);
  }, [socket]);

  // Listen for live user activity
  useEffect(() => {
    if (!socket) return;
    const handleActivity = (data) => {
      setActivityLog((prev) => [{
        id: Date.now(),
        username: data.username,
        action: data.action,
        details: data.details,
        created_at: new Date().toISOString()
      }, ...prev].slice(0, 100));
    };
    socket.on('user_activity', handleActivity);
    return () => socket.off('user_activity', handleActivity);
  }, [socket]);

  const deleteBlog = (id) => {
    setConfirm({ open: true, title: 'Delete Blog', message: 'Are you sure you want to delete this blog?', pendingType: 'blog', pendingId: id });
  };

  const deleteRoom = (id) => {
    setConfirm({ open: true, title: 'Delete Dev Room', message: 'Are you sure you want to delete this dev room?', pendingType: 'room', pendingId: id });
  };

  const openEdit = (type, entity) => {
    if (type === 'blog') {
      setEditDialog({ open: true, type, data: { title: entity.title, summary: entity.summary, category: entity.category, cover_image: entity.cover_image || '' }, id: entity.id, saving: false });
    } else if (type === 'room') {
      setEditDialog({ open: true, type, data: { name: entity.name, description: entity.description || '', github_url: entity.github_url || '' }, id: entity.id, saving: false });
    } else if (type === 'user') {
      setEditDialog({ open: true, type, data: { username: entity.username, email: entity.email, first_name: entity.first_name, last_name: entity.last_name, role: entity.role }, id: entity.id, saving: false });
    } else if (type === 'channel') {
      setEditDialog({ open: true, type, data: { name: entity.name }, id: entity.id, saving: false });
    }
  };

  const handleEditSave = async () => {
    const { type, id, data } = editDialog;
    setEditDialog((prev) => ({ ...prev, saving: true }));
    try {
      if (type === 'blog') {
        const res = await axios.put(`/api/blogs/${id}`, data);
        setBlogs((prev) => prev.map((b) => b.id === id ? res.data.blog : b));
      } else if (type === 'room') {
        const res = await axios.put(`/api/devrooms/${id}`, data);
        setRooms((prev) => prev.map((r) => r.id === id ? res.data : r));
      } else if (type === 'user') {
        const res = await axios.put(`/api/admin/users/${id}`, data);
        setAllUsers((prev) => prev.map((u) => u.id === id ? res.data : u));
      } else if (type === 'channel') {
        await axios.put(`/api/chat/rooms/${id}`, { name: data.name });
        setAllChannels((prev) => prev.map((ch) => ch.id === id ? { ...ch, name: data.name } : ch));
      }
      setEditDialog((prev) => ({ ...prev, open: false }));
    } catch (err) {
      console.error(err);
      setEditDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const deleteUser = (id) => {
    setConfirm({ open: true, title: 'Delete User', message: 'Delete this user? This action cannot be undone.', pendingType: 'user', pendingId: id });
  };

  const deleteChannel = (id) => {
    setConfirm({ open: true, title: 'Delete Channel', message: 'Delete this channel? All messages will be lost.', pendingType: 'channel', pendingId: id });
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <div className="glass-premium rounded-2xl p-5 border border-white/20 dark:border-gray-800/60">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend !== undefined && (
            <p className={`text-[10px] font-semibold mt-0.5 ${trend >= 0 ? 'text-gray-900' : 'text-gray-400'}`}>
              {trend >= 0 ? '+' : ''}{trend} today
            </p>
          )}
        </div>
        <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.total_users || 0} color="bg-blue-600" />
        <StatCard icon={Code} label="Dev Rooms" value={stats?.total_dev_rooms || 0} color="bg-purple-600" />
        <StatCard icon={MessageSquare} label="Messages" value={stats?.total_messages || 0} color="bg-emerald-600" />
        <StatCard icon={Hash} label="Channels" value={stats?.total_channels || 0} color="bg-orange-600" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-premium rounded-2xl p-5 border border-white/20 dark:border-gray-800/60">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-gray-900" />
            Users & Messages (30 days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trends?.users_over_time || []}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" />
              <Tooltip content={<CustomTooltip formatter={(v) => v} />} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#userGradient)" strokeWidth={2} name="Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-premium rounded-2xl p-5 border border-white/20 dark:border-gray-800/60">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-gray-900" />
            Messages (30 days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trends?.messages_over_time || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" />
              <Tooltip content={<CustomTooltip formatter={(v) => v} />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Messages">
                {trends?.messages_over_time?.map((_, i) => (
                  <Cell key={i} fill={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Activity */}
        <div className="glass-premium rounded-2xl p-5 border border-white/20 dark:border-gray-800/60">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Activity size={16} className="text-gray-900" />
            Live Activity
            <span className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isConnected ? 'bg-gray-900/10 text-gray-900' : 'bg-gray-900/10 text-gray-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-gray-900 animate-pulse' : 'bg-gray-500'}`} />
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </h3>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {activityLog.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Waiting for user activity...</p>
            )}
            {activityLog.slice(0, 50).map((log, i) => (
              <ActivityItem key={log.id || i} log={log} />
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="glass-premium rounded-2xl p-5 border border-white/20 dark:border-gray-800/60">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Users size={16} className="text-gray-900" />
            Recent Users
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.username} className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-gray-900 text-white font-bold flex items-center justify-center text-[10px] uppercase">{u.first_name?.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{u.first_name} {u.last_name}</p>
                  <p className="text-[10px] text-gray-500">@{u.username} · {u.role}</p>
                </div>
                <span className="text-[10px] text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoomsTab = () => (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rooms.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Code size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500">No dev rooms yet.</p>
          </div>
        )}
        {rooms.map((room) => (
          <div key={room.id} className="glass-premium rounded-2xl p-5 border border-white/20 dark:border-gray-800/60">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-bold truncate">{room.name}</h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 flex-wrap">
                  <Calendar size={12} />
                  {new Date(room.created_at).toLocaleDateString()}
                  <span className="mx-1">by</span>
                  <span className="truncate">{room.creator_name}</span>
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit('room', room)} className="apple-btn apple-btn-icon p-1.5 shrink-0"><Edit size={16} /></button>
                <button onClick={() => deleteRoom(room.id)} className="apple-btn apple-btn-icon apple-btn-danger p-1.5 shrink-0"><Trash2 size={16} /></button>
              </div>
            </div>
            {room.description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{room.description}</p>}
            {room.github_url && (
              <a href={room.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs font-medium hover:text-gray-900 transition-colors">
                <GitBranch size={14} /> GitHub <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="glass-premium rounded-2xl border border-white/20 dark:border-gray-800/60 overflow-hidden">
      {allUsers.length > 0 ? allUsers.map((u) => (
        <div key={u.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
          <div className="flex items-center gap-3 min-w-0">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gray-900 text-white font-bold flex items-center justify-center text-xs uppercase">{u.first_name?.charAt(0)}</div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{u.first_name} {u.last_name}</p>
              <p className="text-[10px] text-gray-500">@{u.username} · {u.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${u.role === 'admin' ? 'bg-gray-900/10 text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{u.role}</span>
            <button onClick={() => openEdit('user', u)} className="apple-btn apple-btn-icon p-1.5"><Edit size={14} /></button>
            <button onClick={() => deleteUser(u.id)} className="apple-btn apple-btn-icon apple-btn-danger p-1.5"><Trash2 size={14} /></button>
          </div>
        </div>
      )) : (
        <p className="text-center text-xs text-gray-400 py-10">No users found.</p>
      )}
    </div>
  );

  const renderChannelsTab = () => (
    <div className="glass-premium rounded-2xl border border-white/20 dark:border-gray-800/60 overflow-hidden">
      {allChannels.length > 0 ? allChannels.map((ch) => (
        <div key={ch.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-900/10 text-gray-900 flex items-center justify-center"><Hash size={16} /></div>
            <p className="text-sm font-semibold">#{ch.name}</p>
            {ch.is_protected && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-900/10 text-gray-600">Protected</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit('channel', ch)} className="apple-btn apple-btn-icon p-1.5"><Edit size={14} /></button>
            {!ch.is_protected && (
              <button onClick={() => deleteChannel(ch.id)} className="apple-btn apple-btn-icon apple-btn-danger p-1.5"><Trash2 size={14} /></button>
            )}
          </div>
        </div>
      )) : (
        <p className="text-center text-xs text-gray-400 py-10">No channels yet.</p>
      )}
    </div>
  );

  const renderBlogsTab = () => (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-gray-900/10 border border-gray-900/20 text-gray-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      <div className="glass-premium rounded-2xl border border-white/20 dark:border-gray-800/60 overflow-hidden">
        {blogs.length > 0 ? blogs.map((blog) => (
          <div key={blog.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{blog.title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                <span>{blog.author_username}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">{blog.category || 'General'}</span>
                <span>{new Date(blog.created_at).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit('blog', blog)} className="apple-btn apple-btn-icon p-1.5" title="Edit"><Edit size={14} /></button>
              <button onClick={() => deleteBlog(blog.id)} className="apple-btn apple-btn-icon apple-btn-danger p-1.5" title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        )) : (
          <p className="text-center text-xs text-gray-400 py-10">No blogs posted yet.</p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Activity size={24} className="text-gray-900" />
            Admin Console
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {['overview', 'rooms', 'blogs', 'users', 'channels', 'terminal'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                activeTab === tab ? 'apple-tab apple-tab-active' : 'apple-tab apple-tab-inactive'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'rooms' && 'Dev Rooms'}
              {tab === 'blogs' && 'Blog Management'}
              {tab === 'users' && 'Users'}
              {tab === 'channels' && 'Channels'}
              {tab === 'terminal' && 'Terminal'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'rooms' && renderRoomsTab()}
        {activeTab === 'blogs' && renderBlogsTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'channels' && renderChannelsTab()}
        {activeTab === 'terminal' && (
          <div className="h-[600px] rounded-2xl overflow-hidden border border-white/20 dark:border-gray-800/60">
            <AdminConsole />
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm((prev) => ({ ...prev, open: false }))}
      />
      <EditDialog
        open={editDialog.open}
        type={editDialog.type}
        data={editDialog.data}
        saving={editDialog.saving}
        onDataChange={(data) => setEditDialog((prev) => ({ ...prev, data }))}
        onSave={handleEditSave}
        onCancel={() => setEditDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default AdminBlogs;
