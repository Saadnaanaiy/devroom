import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

const THEMES = {
  green: {
    name: 'green', bg: '#0a0e1a', header: '#0d1225', border: 'gray-800/60',
    prompt: 'text-green-400', command: 'text-green-400',
    error: 'text-red-400', success: 'text-emerald-400',
    system: 'text-cyan-400', input: 'text-yellow-400',
    live: 'text-purple-400', text: 'text-gray-300',
    inputText: 'text-gray-200', placeholder: 'placeholder-gray-600',
    inputPrompt: 'text-yellow-400',
    dot1: 'bg-red-500/80', dot2: 'bg-yellow-500/80', dot3: 'bg-emerald-500/80',
  },
  amber: {
    name: 'amber', bg: '#1a0e0a', header: '#1a0e0a', border: 'amber-800/60',
    prompt: 'text-amber-400', command: 'text-amber-300',
    error: 'text-red-500', success: 'text-amber-200',
    system: 'text-orange-300', input: 'text-amber-400',
    live: 'text-rose-400', text: 'text-amber-100/80',
    inputText: 'text-amber-100', placeholder: 'placeholder-amber-700',
    inputPrompt: 'text-amber-400',
    dot1: 'bg-red-500/80', dot2: 'bg-amber-500/80', dot3: 'bg-orange-500/80',
  },
  blue: {
    name: 'blue', bg: '#0a0e1a', header: '#0a0e1a', border: 'blue-800/60',
    prompt: 'text-blue-400', command: 'text-blue-300',
    error: 'text-red-400', success: 'text-blue-200',
    system: 'text-cyan-300', input: 'text-sky-400',
    live: 'text-violet-400', text: 'text-blue-100/80',
    inputText: 'text-blue-100', placeholder: 'placeholder-blue-700',
    inputPrompt: 'text-sky-400',
    dot1: 'bg-red-500/80', dot2: 'bg-yellow-500/80', dot3: 'bg-emerald-500/80',
  },
  red: {
    name: 'red', bg: '#1a0a0a', header: '#1a0a0a', border: 'red-800/60',
    prompt: 'text-red-400', command: 'text-red-300',
    error: 'text-red-300', success: 'text-pink-300',
    system: 'text-orange-300', input: 'text-yellow-300',
    live: 'text-pink-400', text: 'text-red-100/80',
    inputText: 'text-red-100', placeholder: 'placeholder-red-700',
    inputPrompt: 'text-yellow-300',
    dot1: 'bg-red-500/80', dot2: 'bg-orange-500/80', dot3: 'bg-pink-500/80',
  },
  purple: {
    name: 'purple', bg: '#0e0a1a', header: '#0e0a1a', border: 'purple-800/60',
    prompt: 'text-purple-400', command: 'text-purple-300',
    error: 'text-red-400', success: 'text-purple-200',
    system: 'text-fuchsia-300', input: 'text-pink-400',
    live: 'text-cyan-400', text: 'text-purple-100/80',
    inputText: 'text-purple-100', placeholder: 'placeholder-purple-700',
    inputPrompt: 'text-pink-400',
    dot1: 'bg-red-500/80', dot2: 'bg-purple-500/80', dot3: 'bg-pink-500/80',
  },
  white: {
    name: 'white', bg: '#f5f5f0', header: '#ecece5', border: 'gray-300/60',
    prompt: 'text-green-700', command: 'text-green-700',
    error: 'text-red-600', success: 'text-emerald-600',
    system: 'text-cyan-700', input: 'text-amber-700',
    live: 'text-purple-600', text: 'text-gray-800',
    inputText: 'text-gray-900', placeholder: 'placeholder-gray-400',
    inputPrompt: 'text-amber-700',
    dot1: 'bg-red-400/80', dot2: 'bg-yellow-400/80', dot3: 'bg-emerald-400/80',
  },
};

const CMD_HELP = (theme) => `Available commands:
  help                          Show this help
  clear                         Clear terminal
  stats                         Show platform statistics
  users                         List all users
  user <id>                     View user details
  user edit <id>                Edit user (interactive)
  user verify <id>              Verify user's email
  user delete <id>              Delete user
  mkuser                        Create a new user (interactive)
  rooms                         List all dev rooms
  room <id>                     View room details
  room edit <id>                Edit room (interactive)
  room delete <id>              Delete room
  mkroom <name>                 Create a new dev room
  blogs                         List all blogs
  blog <id>                     View blog details
  blog edit <id>                Edit blog (interactive)
  blog delete <id>              Delete blog
  channels                      List all chat channels
  mkchannel <name>              Create a new chat channel
  theme [name]                  Show or change color theme
                                 Available: ${Object.keys(THEMES).join(', ')}`;

const PROMPT = 'admin@devroom:~$ ';

const AdminConsole = () => {
  const { socket } = useSocket();
  const [lines, setLines] = useState([
    { text: 'DevRoom Admin Console v1.0', type: 'system' },
    { text: 'Type "help" for available commands.', type: 'system' },
    { text: '', type: 'system' },
  ]);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editStep, setEditStep] = useState(0);
  const [editKeys, setEditKeys] = useState([]);
  const [editIdx, setEditIdx] = useState(0);
  const [allData, setAllData] = useState({ users: [], rooms: [], blogs: [], channels: [] });
  const [theme, setTheme] = useState('green');
  const outputRef = useRef(null);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  const T = THEMES[theme] || THEMES.green;

  const addLine = useCallback((text, type = 'text') => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const addLines = useCallback((texts, type = 'text') => {
    setLines((prev) => [...prev, ...texts.map((t) => ({ text: t, type }))]);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (!editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/users');
      setAllData((prev) => ({ ...prev, users: res.data }));
      return res.data;
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
      return null;
    }
  }, [addLine]);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      const res = await axios.get('/api/devrooms');
      setAllData((prev) => ({ ...prev, rooms: res.data }));
      return res.data;
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
      return null;
    }
  }, [addLine]);

  // Fetch blogs
  const fetchBlogs = useCallback(async () => {
    try {
      const res = await axios.get('/api/blogs');
      setAllData((prev) => ({ ...prev, blogs: res.data }));
      return res.data;
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
      return null;
    }
  }, [addLine]);

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await axios.get('/api/chat/rooms');
      setAllData((prev) => ({ ...prev, channels: res.data.channels || [] }));
      return res.data.channels || [];
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
      return null;
    }
  }, [addLine]);

  const handleStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      const s = res.data.stats;
      const groups = [
        {
          header: 'Users & Content',
          items: [
            { label: 'Users', value: s.total_users, type: 'success' },
            { label: 'Blogs', value: s.total_blogs, type: 'input' },
            { label: 'Comments', value: s.total_comments, type: 'live' },
            { label: 'Likes', value: s.total_likes, type: 'system' },
            { label: 'Saved Blogs', value: s.total_saved_blogs, type: 'text' },
            { label: 'Ratings', value: s.total_ratings, type: 'input' },
          ],
        },
        {
          header: 'Chat & Rooms',
          items: [
            { label: 'Channels', value: s.total_channels, type: 'live' },
            { label: 'Dev Rooms', value: s.total_dev_rooms, type: 'success' },
            { label: 'Messages', value: s.total_messages, type: 'input' },
            { label: 'Chat Members', value: s.total_chat_members, type: 'system' },
          ],
        },
        {
          header: 'Activity',
          items: [
            { label: 'Activity Logs', value: s.total_activity_logs, type: 'text' },
          ],
        },
      ];
      const allItems = groups.flatMap((g) => g.items);
      const maxVal = Math.max(...allItems.map((i) => i.value), 1);
      const barLen = 20;
      groups.forEach(({ header, items }) => {
        addLine('', 'text');
        addLine(`  ${header}`, 'system');
        addLine(`  ${'\u2500'.repeat(36)}`, 'text');
        items.forEach(({ label, value, type }) => {
          const filled = Math.round((value / maxVal) * barLen);
          const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(Math.max(barLen - filled, 0));
          const pct = Math.round((value / maxVal) * 100);
          addLine(`  ${label.padEnd(14)} ${String(value).padStart(6)}  ${bar}  ${pct}%`, type);
        });
      });
      addLine('', 'text');
      addLine(`  Total items: ${allItems.reduce((s, i) => s + i.value, 0)}`, 'success');
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const handleUsers = useCallback(async () => {
    const data = await fetchUsers();
    if (!data || data.length === 0) {
      addLine('No users found.', 'text');
      return;
    }
    addLines([
      `${'ID'.padEnd(5)} ${'Username'.padEnd(16)} ${'Email'.padEnd(28)} ${'Name'.padEnd(20)} ${'Role'.padEnd(8)} ${'Verified'}`,
      '─'.repeat(90),
      ...data.map((u) =>
        `${String(u.id).padEnd(5)} ${(u.username || '').padEnd(16)} ${(u.email || '').padEnd(28)} ${`${u.first_name || ''} ${u.last_name || ''}`.padEnd(20)} ${(u.role || '').padEnd(8)} ${u.is_verified ? 'Yes' : 'No'}`
      ),
    ], 'text');
  }, [fetchUsers, addLine, addLines]);

  const handleUserDetail = useCallback(async (id) => {
    const data = await fetchUsers();
    if (!data) return;
    const u = data.find((x) => x.id === Number(id));
    if (!u) { addLine(`User #${id} not found.`, 'error'); return; }
    addLines([
      `ID:        ${u.id}`,
      `Username:  ${u.username}`,
      `Email:     ${u.email}`,
      `Name:      ${u.first_name} ${u.last_name}`,
      `Phone:     ${u.phone || 'N/A'}`,
      `Role:      ${u.role}`,
      `Verified:  ${u.is_verified ? 'Yes' : 'No'}`,
      `Created:   ${new Date(u.created_at).toLocaleString()}`,
    ], 'text');
  }, [fetchUsers, addLine, addLines]);

  const handleUserVerify = useCallback(async (id) => {
    try {
      const res = await axios.post(`/api/admin/users/${id}/verify`);
      addLine(`User #${id} verified.`, 'success');
      setAllData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === Number(id) ? res.data.user : u)),
      }));
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const handleUserDelete = useCallback(async (id) => {
    try {
      await axios.delete(`/api/admin/users/${id}`);
      addLine(`User #${id} deleted.`, 'success');
      setAllData((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== Number(id)) }));
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const handleUserEditStart = useCallback(async (id) => {
    const data = await fetchUsers();
    if (!data) return;
    const u = data.find((x) => x.id === Number(id));
    if (!u) { addLine(`User #${id} not found.`, 'error'); return; }
    const fields = [
      { key: 'first_name', label: 'First Name', default: u.first_name },
      { key: 'last_name', label: 'Last Name', default: u.last_name },
      { key: 'username', label: 'Username', default: u.username },
      { key: 'email', label: 'Email', default: u.email },
      { key: 'role', label: 'Role (user/admin)', default: u.role },
    ];
    setEditKeys(fields);
    setEditIdx(0);
    setEditFields(fields.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}));
    setEditing({ type: 'user', id: Number(id), fields, total: fields.length });
    setEditStep(1);
    addLine(`Editing User #${id}. Enter new values or press Enter to keep current.`, 'system');
    addLine(`  ${fields[0].label} [${fields[0].default}]:`, 'input');
  }, [fetchUsers, addLine]);

  const handleRoomDelete = useCallback(async (id) => {
    try {
      await axios.delete(`/api/devrooms/${id}`);
      addLine(`Room #${id} deleted.`, 'success');
      setAllData((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== Number(id)) }));
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const handleRooms = useCallback(async () => {
    const data = await fetchRooms();
    if (!data || data.length === 0) {
      addLine('No dev rooms found.', 'text');
      return;
    }
    addLines([
      `${'ID'.padEnd(5)} ${'Name'.padEnd(24)} ${'Creator'.padEnd(16)} ${'Created'.padEnd(12)}`,
      '─'.repeat(60),
      ...data.map((r) =>
        `${String(r.id).padEnd(5)} ${(r.name || '').padEnd(24)} ${(r.creator_name || '').padEnd(16)} ${new Date(r.created_at).toLocaleDateString().padEnd(12)}`
      ),
    ], 'text');
  }, [fetchRooms, addLine, addLines]);

  const handleRoomDetail = useCallback(async (id) => {
    try {
      const res = await axios.get(`/api/devrooms/${id}`);
      const r = res.data;
      addLines([
        `ID:          ${r.id}`,
        `Name:        ${r.name}`,
        `Description: ${r.description || 'N/A'}`,
        `GitHub URL:  ${r.github_url || 'N/A'}`,
        `Creator:     ${r.creator_name}`,
        `Created:     ${new Date(r.created_at).toLocaleString()}`,
      ], 'text');
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine, addLines]);

  const handleRoomEditStart = useCallback(async (id) => {
    try {
      const res = await axios.get(`/api/devrooms/${id}`);
      const r = res.data;
      const fields = [
        { key: 'name', label: 'Name', default: r.name },
        { key: 'description', label: 'Description', default: r.description || '' },
        { key: 'github_url', label: 'GitHub URL', default: r.github_url || '' },
      ];
      setEditKeys(fields);
      setEditIdx(0);
      setEditFields(fields.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}));
      setEditing({ type: 'room', id: Number(id), fields, total: fields.length });
      setEditStep(1);
      addLine(`Editing Room #${id}. Enter new values or press Enter to keep current.`, 'system');
      addLine(`  ${fields[0].label} [${fields[0].default}]:`, 'input');
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const handleBlogs = useCallback(async () => {
    const data = await fetchBlogs();
    if (!data || data.length === 0) {
      addLine('No blogs found.', 'text');
      return;
    }
    addLines([
      `${'ID'.padEnd(5)} ${'Title'.padEnd(40)} ${'Author'.padEnd(16)} ${'Category'.padEnd(14)} ${'Created'.padEnd(12)}`,
      '─'.repeat(90),
      ...data.map((b) =>
        `${String(b.id).padEnd(5)} ${(b.title || '').slice(0, 38).padEnd(40)} ${(b.author_username || '').padEnd(16)} ${(b.category || 'General').padEnd(14)} ${new Date(b.created_at).toLocaleDateString().padEnd(12)}`
      ),
    ], 'text');
  }, [fetchBlogs, addLine, addLines]);

  const handleBlogDetail = useCallback(async (id) => {
    try {
      const res = await axios.get(`/api/blogs/${id}`);
      const b = res.data;
      addLines([
        `ID:          ${b.id}`,
        `Title:       ${b.title}`,
        `Category:    ${b.category || 'General'}`,
        `Author:      ${b.author_username}`,
        `Summary:     ${b.summary || 'N/A'}`,
        `Created:     ${new Date(b.created_at).toLocaleString()}`,
        `Likes:       ${b.likes_count || 0}  |  Avg Rating: ${b.avg_rating ? b.avg_rating.toFixed(1) : 'N/A'}`,
      ], 'text');
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine, addLines]);

  const handleBlogDelete = useCallback(async (id) => {
    try {
      await axios.delete(`/api/blogs/${id}`);
      addLine(`Blog #${id} deleted.`, 'success');
      setAllData((prev) => ({ ...prev, blogs: prev.blogs.filter((b) => b.id !== Number(id)) }));
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const handleBlogEditStart = useCallback(async (id) => {
    try {
      const res = await axios.get(`/api/blogs/${id}`);
      const b = res.data;
      const fields = [
        { key: 'title', label: 'Title', default: b.title },
        { key: 'category', label: 'Category', default: b.category || 'General' },
        { key: 'summary', label: 'Summary', default: b.summary || '' },
      ];
      setEditKeys(fields);
      setEditIdx(0);
      setEditFields(fields.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}));
      setEditing({ type: 'blog', id: Number(id), fields, total: fields.length });
      setEditStep(1);
      addLine(`Editing Blog #${id}. Enter new values or press Enter to keep current.`, 'system');
      addLine(`  ${fields[0].label} [${fields[0].default}]:`, 'input');
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const handleChannels = useCallback(async () => {
    const data = await fetchChannels();
    if (!data || data.length === 0) {
      addLine('No channels found.', 'text');
      return;
    }
    addLines([
      `${'ID'.padEnd(5)} ${'Name'.padEnd(24)} ${'Protected'.padEnd(12)} ${'Created'.padEnd(12)}`,
      '─'.repeat(55),
      ...data.map((ch) =>
        `${String(ch.id).padEnd(5)} ${`#${ch.name}`.padEnd(24)} ${(ch.is_protected ? 'Yes' : 'No').padEnd(12)} ${new Date(ch.created_at).toLocaleDateString().padEnd(12)}`
      ),
    ], 'text');
  }, [fetchChannels, addLine, addLines]);

  const handleMkuser = useCallback(() => {
    const fields = [
      { key: 'username', label: 'Username', default: '' },
      { key: 'email', label: 'Email', default: '' },
      { key: 'password', label: 'Password', default: '' },
      { key: 'first_name', label: 'First Name', default: '' },
      { key: 'last_name', label: 'Last Name', default: '' },
    ];
    setEditKeys(fields);
    setEditIdx(0);
    setEditFields(fields.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}));
    setEditing({ type: 'user', id: null, fields, total: fields.length });
    setEditStep(1);
    addLine('Creating new user. Enter values (required fields):', 'system');
    addLine(`  ${fields[0].label} [${fields[0].default}]:`, 'input');
  }, [addLine]);

  const handleMkchannel = useCallback(async (name) => {
    try {
      await axios.post('/api/chat/rooms', { name });
      addLine(`Channel "#${name}" created.`, 'success');
      const channels = await fetchChannels();
      if (channels) setAllData((prev) => ({ ...prev, channels }));
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine, fetchChannels]);

  const handleMkroom = useCallback(async (name) => {
    try {
      const res = await axios.post('/api/devrooms', { name });
      addLine(`Room "${name}" created (ID: ${res.data.room?.id || res.data.id}).`, 'success');
    } catch (err) {
      addLine(`Error: ${err.response?.data?.message || err.message}`, 'error');
    }
  }, [addLine]);

  const executeCommand = useCallback(async (cmdLine) => {
    const trimmed = cmdLine.trim();
    if (!trimmed) return;

    addLine(`${PROMPT}${trimmed}`, 'command');

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        addLines(CMD_HELP(theme).split('\n'), 'system');
        break;
      case 'clear':
        setLines([]);
        break;
      case 'theme': {
        const t = args[0]?.toLowerCase();
        if (!t || !THEMES[t]) {
          addLine(`Available themes: ${Object.keys(THEMES).join(', ')}`, 'system');
          addLine(`Current theme: ${theme}`, 'text');
        } else {
          setTheme(t);
          addLine(`Theme changed to "${t}".`, 'success');
        }
        break;
      }
      case 'stats':
        await handleStats();
        break;
      case 'users':
        await handleUsers();
        break;
      case 'user':
        if (args.length === 0) {
          addLine('Usage: user <id> | user edit <id> | user delete <id>', 'system');
        } else if (args[0] === 'verify' && args[1]) {
          await handleUserVerify(args[1]);
        } else if (args[0] === 'delete' && args[1]) {
          await handleUserDelete(args[1]);
        } else if (args[0] === 'edit' && args[1]) {
          await handleUserEditStart(args[1]);
        } else {
          await handleUserDetail(args[0]);
        }
        break;
      case 'rooms':
        await handleRooms();
        break;
      case 'room':
        if (args.length === 0) {
          addLine('Usage: room <id> | room edit <id> | room delete <id>', 'system');
        } else if (args[0] === 'delete' && args[1]) {
          await handleRoomDelete(args[1]);
        } else if (args[0] === 'edit' && args[1]) {
          await handleRoomEditStart(args[1]);
        } else {
          await handleRoomDetail(args[0]);
        }
        break;
      case 'blogs':
        await handleBlogs();
        break;
      case 'blog':
        if (args.length === 0) {
          addLine('Usage: blog <id> | blog edit <id> | blog delete <id>', 'system');
        } else if (args[0] === 'delete' && args[1]) {
          await handleBlogDelete(args[1]);
        } else if (args[0] === 'edit' && args[1]) {
          await handleBlogEditStart(args[1]);
        } else {
          await handleBlogDetail(args[0]);
        }
        break;
      case 'channels':
        await handleChannels();
        break;
      case 'mkuser':
        handleMkuser();
        break;
      case 'mkchannel':
        if (!args[0]) {
          addLine('Usage: mkchannel <name>', 'system');
        } else {
          await handleMkchannel(args[0]);
        }
        break;
      case 'mkroom':
        if (!args[0]) {
          addLine('Usage: mkroom <name>', 'system');
        } else {
          await handleMkroom(args[0]);
        }
        break;
      default:
        addLine(`Command not found: ${cmd}. Type "help" for available commands.`, 'error');
    }
  }, [addLine, addLines, theme, handleStats, handleUsers, handleUserDetail, handleUserVerify, handleUserDelete, handleUserEditStart, handleRooms, handleRoomDetail, handleRoomDelete, handleRoomEditStart, handleBlogs, handleBlogDetail, handleBlogDelete, handleBlogEditStart, handleChannels, handleMkuser, handleMkchannel, handleMkroom]);

  const handleSaveEdit = useCallback(async () => {
    const { type, id, fields } = editing;
    try {
      if (type === 'user' && id === null) {
        const res = await axios.post('/api/auth/register', editFields);
        const newUser = res.data.user || res.data;
        addLine(`User "${newUser.username}" created (ID: ${newUser.id}).`, 'success');
        const users = await fetchUsers();
        if (users) setAllData((prev) => ({ ...prev, users }));
      } else if (type === 'user') {
        const res = await axios.put(`/api/admin/users/${id}`, editFields);
        setAllData((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === id ? res.data : u)),
        }));
        addLine(`User #${id} updated.`, 'success');
      } else if (type === 'room') {
        const res = await axios.put(`/api/devrooms/${id}`, editFields);
        setAllData((prev) => ({
          ...prev,
          rooms: prev.rooms.map((r) => (r.id === id ? res.data : r)),
        }));
        addLine(`Room #${id} updated.`, 'success');
      } else if (type === 'blog') {
        const res = await axios.put(`/api/blogs/${id}`, editFields);
        setAllData((prev) => ({
          ...prev,
          blogs: prev.blogs.map((b) => (b.id === id ? res.data.blog : b)),
        }));
        addLine(`Blog #${id} updated.`, 'success');
      }
    } catch (err) {
      addLine(`Error saving: ${err.response?.data?.message || err.message}`, 'error');
    }
    setEditing(null);
    setEditStep(0);
  }, [editing, editFields, addLine, fetchUsers]);

  const handleKeyDown = (e) => {
    if (editing) {
      if (e.key === 'Enter') {
        const currentField = editKeys[editIdx];
        const val = e.target.value.trim();
        if (val) {
          setEditFields((prev) => ({ ...prev, [currentField.key]: val }));
        }
        const nextIdx = editIdx + 1;
        if (editInputRef.current) editInputRef.current.value = '';
        if (nextIdx >= editKeys.length) {
          handleSaveEdit();
        } else {
          setEditIdx(nextIdx);
          addLine(`  ${editKeys[nextIdx].label} [${editKeys[nextIdx].default}]:`, 'input');
        }
      }
      return;
    }

    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    }
  };

  // Listen for live activity
  useEffect(() => {
    if (!socket) return;
    const handleActivity = (data) => {
      addLine(`[LIVE] ${data.username} ${data.action}${data.details ? ` - ${data.details}` : ''}`, 'live');
    };
    socket.on('user_activity', handleActivity);
    return () => socket.off('user_activity', handleActivity);
  }, [socket, addLine]);

  const renderLine = (line, i) => {
    const base = 'font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all';
    switch (line.type) {
      case 'command':
        return <div key={i} className={`${base} ${T.command}`}>{line.text}</div>;
      case 'error':
        return <div key={i} className={`${base} ${T.error}`}>{line.text}</div>;
      case 'success':
        return <div key={i} className={`${base} ${T.success}`}>{line.text}</div>;
      case 'system':
        return <div key={i} className={`${base} ${T.system}`}>{line.text}</div>;
      case 'input':
        return <div key={i} className={`${base} ${T.input}`}>{line.text}</div>;
      case 'live':
        return <div key={i} className={`${base} ${T.live} text-[11px]`}>{line.text}</div>;
      default:
        return <div key={i} className={`${base} ${T.text}`}>{line.text}</div>;
    }
  };

  const borderClr = theme === 'white' ? '#d1d5db' : '#1f2937';

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: T.bg }}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-b" style={{ backgroundColor: T.header, borderColor: borderClr }}>
        <div className="flex gap-1.5">
          <div className={`h-3 w-3 rounded-full ${T.dot1}`} />
          <div className={`h-3 w-3 rounded-full ${T.dot2}`} />
          <div className={`h-3 w-3 rounded-full ${T.dot3}`} />
        </div>
        <span className="text-[11px] font-mono text-gray-500 ml-2">admin@devroom — Console ({T.name})</span>
      </div>

      {/* Terminal output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 space-y-0.5"
        style={{ scrollBehavior: 'smooth' }}
        onClick={() => !editing && inputRef.current?.focus()}
      >
        {lines.length === 0 && (
          <div className={`font-mono text-[13px] ${T.text} opacity-50`}>Terminal cleared.</div>
        )}
        {lines.map(renderLine)}
      </div>

      {/* Input line */}
      <div className="shrink-0 border-t" style={{ backgroundColor: T.header, borderColor: borderClr }}>
        {editing ? (
          <div className="flex items-center px-4 py-3 gap-2">
            <span className={`font-mono text-[13px] ${T.inputPrompt} shrink-0`}>{'>>'}</span>
            <input
              ref={editInputRef}
              type="text"
              className={`flex-1 bg-transparent border-none outline-none font-mono text-[13px] ${T.inputText}`}
              placeholder={`Enter value for ${editKeys[editIdx]?.label || ''}...`}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center px-4 py-3 gap-2">
            <span className={`font-mono text-[13px] ${T.prompt} shrink-0`}>{PROMPT}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`flex-1 bg-transparent border-none outline-none font-mono text-[13px] ${T.inputText} ${T.placeholder}`}
              placeholder="Type a command..."
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConsole;
