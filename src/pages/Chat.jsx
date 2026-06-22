import axios from 'axios';
import {
  Check,
  CheckCheck,
  ChevronDown,
  Code,
  Code2,
  Copy,
  Edit,
  Hash,
  Image as ImageIcon,
  Plus,
  Search,
  Smile,
  Terminal,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { getImageUrl } from '../utils/imageUrl';

const Chat = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected, onlineUsers, typingStatus, emitTyping } = useSocket();
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [dms, setDms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // Sidebar Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('channels');

  // DM Modal
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Local uploading
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  // Emojis dropdown
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojis = [
    '💻',
    '🚀',
    '🔥',
    '👍',
    '🧠',
    '🛠️',
    '🎉',
    '🐛',
    '✅',
    '🔄',
    '📦',
    '⚡',
    '🔧',
    '🎯',
  ];

  // Code Editor Modal
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeEditorContent, setCodeEditorContent] = useState('');
  const [codeEditorLang, setCodeEditorLang] = useState('javascript');
  const codeEditorTextareaRef = useRef(null);

  const codeLanguages = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python', label: 'Python' },
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' },
    { id: 'cpp', label: 'C++' },
    { id: 'java', label: 'Java' },
    { id: 'rust', label: 'Rust' },
    { id: 'go', label: 'Go' },
    { id: 'sql', label: 'SQL' },
    { id: 'bash', label: 'Bash' },
    { id: 'json', label: 'JSON' },
    { id: 'xml', label: 'XML' },
    { id: 'yaml', label: 'YAML' },
    { id: 'markdown', label: 'Markdown' },
  ];

  const detectLanguage = (code) => {
    const t = code.trim();
    if (!t) return 'javascript';
    if (t.startsWith('#!/usr/bin/python') || t.startsWith('#!/usr/bin/env python')) return 'python';
    if (t.startsWith('#!/bin/bash') || t.startsWith('#!/usr/bin/env bash')) return 'bash';
    if (t.startsWith('#!/usr/bin/node')) return 'javascript';
    if (/^(import |from |def |class |print |if __name__)/m.test(t)) return 'python';
    if (/^(import |export |const |let |var |function |interface |type |=>)/m.test(t))
      return 'typescript';
    if (/^<!DOCTYPE|<html|<head|<body|<div|<span|<p>|<a\s/m.test(t)) return 'html';
    if (/^(@media|\.\w+\s*\{|#\w+\s*\{|\w+\s*:\s*\w+)/m.test(t)) return 'css';
    if (/^(fn |let mut|use |pub |impl |struct |enum )/m.test(t)) return 'rust';
    if (/^(public class|private |void |static |String\[\] args)/m.test(t)) return 'java';
    if (/^(#include|int main|printf\()/m.test(t)) return 'cpp';
    if (/^(SELECT |INSERT |UPDATE |DELETE |CREATE TABLE|ALTER TABLE)/im.test(t)) return 'sql';
    if (/(self\.|__init__|@\w+|\.append\(|\.join\()/.test(t)) return 'python';
    if (/console\.|document\.|window\.|\.querySelector|\.addEventListener/.test(t))
      return 'javascript';
    if (t.startsWith('{') || t.startsWith('[')) return 'json';
    if (t.startsWith('#')) return 'yaml';
    return 'javascript';
  };

  // Typing helper
  const typingTimeoutRef = useRef(null);
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);

  // Scroll ref
  const messagesEndRef = useRef(null);

  // Copy code blocks
  const [copiedId, setCopiedId] = useState(null);

  // Channel creation (admin)
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  // Channel editing (admin)
  const [editChannelOpen, setEditChannelOpen] = useState(false);
  const [editChannelId, setEditChannelId] = useState(null);
  const [editChannelName, setEditChannelName] = useState('');

  // Clear chat confirmation
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', pendingType: '', pendingId: null });
  const [clearChatConfirm, setClearChatConfirm] = useState(false);

  // Profile dropdown
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Mobile room dropdown
  const [mobileRoomDropdown, setMobileRoomDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch rooms list (channels and direct message rooms)
  const fetchRooms = async (autoSelectId = null) => {
    try {
      const response = await axios.get('/api/chat/rooms');
      setChannels(response.data.channels);
      setDms(response.data.dms);

      // Auto-select room if requested, or select first channel by default
      if (autoSelectId) {
        const foundChannel = response.data.channels.find((c) => c.id === autoSelectId);
        const foundDm = response.data.dms.find((d) => d.id === autoSelectId);
        setActiveRoom(foundChannel || foundDm || null);
      } else if (!activeRoom) {
        if (response.data.channels.length > 0) {
          setActiveRoom(response.data.channels[0]);
        } else if (response.data.dms.length > 0) {
          setActiveRoom(response.data.dms[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    // Default to channels tab (especially useful to show #general)
    if (user && !activeRoom) setActiveTab('channels');
  }, [user]);

  // Fetch messages and manage socket room joining on active room change
  useEffect(() => {
    if (!activeRoom) return;

    // Join room in socket
    if (socket && isConnected) {
      socket.emit('join', { room_id: activeRoom.id });
    }

    // Fetch message history
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/chat/rooms/${activeRoom.id}/messages`);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching message history:', error);
      }
    };
    fetchMessages();

    // Clean up room leave on active room change
    return () => {
      if (socket && isConnected && activeRoom) {
        socket.emit('leave', { room_id: activeRoom.id });
      }
    };
  }, [activeRoom, socket, isConnected]);

  // Socket message listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (activeRoom && message.room_id === activeRoom.id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, activeRoom]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus]);

  // Handle typing event emitting
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!activeRoom || !socket || !isConnected) return;

    if (!isCurrentlyTyping) {
      setIsCurrentlyTyping(true);
      emitTyping(activeRoom.id, true);
    }

    // Reset debounce timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsCurrentlyTyping(false);
      emitTyping(activeRoom.id, false);
    }, 2000);
  };

  const handleSendMessage = (e, textOverride = null) => {
    if (e) e.preventDefault();
    const content = textOverride || inputText.trim();
    if (!content || !activeRoom || !socket || !isConnected) return;

    // Determine type: check if it's a code block
    let messageType = 'text';
    if (content.startsWith('```') && content.endsWith('```')) {
      messageType = 'code';
    }

    socket.emit('send_message', {
      room_id: activeRoom.id,
      content,
      message_type: messageType,
    });

    if (!textOverride) {
      setInputText('');
      // Emit typing indicator false immediately on send
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsCurrentlyTyping(false);
      emitTyping(activeRoom.id, false);
    }
  };

  // Open the VS Code-like code editor modal
  const openCodeEditor = () => {
    setCodeEditorContent('');
    setCodeEditorLang('javascript');
    setShowCodeEditor(true);
    setTimeout(() => codeEditorTextareaRef.current?.focus(), 100);
  };

  const handleCodeEditorChange = (e) => {
    const val = e.target.value;
    setCodeEditorContent(val);
    if (val.trim()) {
      setCodeEditorLang(detectLanguage(val));
    }
  };

  const handleCodeSend = () => {
    const code = codeEditorContent.trim();
    if (!code) return;
    const content = '```' + codeEditorLang + '\n' + code + '\n```';
    handleSendMessage(null, content);
    setShowCodeEditor(false);
    setCodeEditorContent('');
  };

  // Open Direct Message modal and fetch users
  const handleOpenDMModal = async () => {
    setDmModalOpen(true);
    try {
      const userResponse = await axios.get('/api/chat/users');
      setUsersList(userResponse.data);
    } catch (error) {
      console.error('Error loading users list:', error);
    }
  };

  const handleCreateDM = async (recipientId) => {
    try {
      const response = await axios.post('/api/chat/rooms/direct', { recipient_id: recipientId });
      setDmModalOpen(false);
      // Refresh rooms and auto-select new DM room
      await fetchRooms(response.data.id);
      setActiveTab('dms');
    } catch (error) {
      console.error('Error starting DM:', error);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName) return;
    try {
      const response = await axios.post('/api/chat/rooms', { name: newChannelName });
      setCreateChannelOpen(false);
      setNewChannelName('');
      await fetchRooms(response.data.id);
      setActiveTab('channels');
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const handleEditChannel = async () => {
    if (!editChannelName) return;
    try {
      await axios.put(`/api/chat/rooms/${editChannelId}`, { name: editChannelName });
      setEditChannelOpen(false);
      setEditChannelId(null);
      setEditChannelName('');
      await fetchRooms();
    } catch (error) {
      console.error('Error editing channel:', error);
    }
  };

  const handleDeleteChannel = (roomId) => {
    setConfirm({ open: true, title: 'Delete Channel', message: 'Delete this channel and all its messages?', pendingType: 'channel', pendingId: roomId });
  };

  const handleConfirmDelete = async () => {
    const { pendingType, pendingId } = confirm;
    setConfirm((prev) => ({ ...prev, open: false }));
    try {
      if (pendingType === 'channel') {
        await axios.delete(`/api/chat/rooms/${pendingId}`);
        if (activeRoom?.id === pendingId) setActiveRoom(null);
        await fetchRooms();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleClearChat = async () => {
    if (!activeRoom) return;
    try {
      await axios.delete(`/api/chat/messages/${activeRoom.id}`);
      setMessages([]);
      setClearChatConfirm(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  // Upload attachment locally (images)
  const handleImageUploadClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeRoom) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imgUrl = response.data.file_url;
      socket.emit('send_message', {
        room_id: activeRoom.id,
        content: imgUrl,
        message_type: 'image',
      });
    } catch (error) {
      console.error('Error uploading chat attachment:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const copyToClipboard = (code, msgId) => {
    navigator.clipboard.writeText(code);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Search filter sidebar items
  const filteredChannels = channels.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredDms = dms.filter((d) => d.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  // Search filter user list in DM modal
  const filteredUsers = usersList.filter(
    (u) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // Helper to extract code content from markdown block
  const parseCodeBlock = (content) => {
    const lines = content.split('\n');
    let language = 'code';
    let codeLines = [];

    if (lines[0].startsWith('```')) {
      language = lines[0].slice(3) || 'javascript';
    }

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '```') break;
      codeLines.push(lines[i]);
    }

    return { language, code: codeLines.join('\n') };
  };

  const normalizeUrl = (url) => getImageUrl(url);

  // Active room typing users
  const roomTypingUsers = typingStatus[activeRoom?.id]
    ? Object.keys(typingStatus[activeRoom.id])
    : [];

  return (
    <div className="flex-1 flex min-h-0 w-full relative">
      {/* 1. SIDEBAR PANELS (desktop only) */}
      <div className="hidden md:flex md:flex-col w-80 border-r border-gray-200/50 dark:border-gray-800/50 min-h-0 bg-white/40 dark:bg-gray-950/40 backdrop-blur-md">

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-300"
              size={16}
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl text-xs outline-none focus:border-gray-900 transition-colors"
            />
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 flex gap-1.5 mb-3">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-transparent apple-tab ${
              activeTab === 'channels' ? 'apple-tab-active' : 'apple-tab-inactive'
            }`}
          >
            <Hash size={14} />
            Channels
          </button>

          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-transparent apple-tab ${
              activeTab === 'dms' ? 'apple-tab-active' : 'apple-tab-inactive'
            }`}
          >
            <UserPlus size={14} />
            Directs
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {activeTab === 'channels' ? (
            <div>
              {user?.role === 'admin' && (
                <div className="px-2 mb-2">
                  <button
                    onClick={() => setCreateChannelOpen(true)}
                    className="w-full p-2 rounded-xl text-xs font-semibold apple-btn apple-btn-secondary"
                  >
                    + Create Channel
                  </button>
                </div>
              )}
              {filteredChannels.map((ch) => (
                <div key={ch.id} className="group relative">
                  <button
                    onClick={() => setActiveRoom(ch)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left apple-btn ${
                      activeRoom?.id === ch.id ? 'apple-btn-active glow-green' : 'apple-btn-ghost'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`h-8 w-8 rounded-lg ${activeRoom?.id === ch.id ? 'bg-black text-white' : 'bg-gray-200 dark:bg-gray-900'} flex items-center justify-center text-sm font-bold uppercase`}
                      >
                        <Hash size={16} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold leading-none">#{ch.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                          Public channel
                        </p>
                      </div>
                    </div>
                  </button>
                  {user?.role === 'admin' && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setEditChannelId(ch.id);
                          setEditChannelName(ch.name);
                          setEditChannelOpen(true);
                        }}
                        className="h-6 w-6 flex items-center justify-center apple-btn apple-btn-icon"
                      >
                        <Edit size={12} />
                      </button>
                      {!ch.is_protected && (
                        <button
                          onClick={() => handleDeleteChannel(ch.id)}
                          className="h-6 w-6 flex items-center justify-center apple-btn apple-btn-icon"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              {/* Add DM action */}
              <button
                onClick={handleOpenDMModal}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left border border-dashed border-gray-300 dark:border-gray-800 text-xs font-bold apple-btn apple-btn-ghost"
              >
                <Plus size={16} className="stroke-[2.5]" />
                Start Developer Chat
              </button>

              {filteredDms.map((dm) => {
                const otherUserId = dm.other_user_id;
                const isUserOnline = onlineUsers.includes(otherUserId);
                const isActive = activeRoom?.id === dm.id;

                return (
                  <button
                    key={dm.id}
                    onClick={() => setActiveRoom(dm)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left apple-btn ${
                      isActive ? 'apple-btn-active glow-green' : 'apple-btn-ghost'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="relative shrink-0">
                        {dm.avatar_url ? (
                          <img
                            src={normalizeUrl(dm.avatar_url)}
                            alt={dm.name}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-black text-white font-bold flex items-center justify-center text-sm uppercase">
                            {dm.name.charAt(0)}
                          </div>
                        )}
                        {isUserOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-950 bg-emerald-500"></span>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold leading-none truncate">{dm.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                          <span className={isUserOnline ? 'text-emerald-500 font-semibold' : 'text-gray-400'}>
                            {isUserOnline ? 'Online' : 'Offline'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {activeRoom ? (
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {/* Mobile room selector dropdown */}
          <div className="md:hidden relative shrink-0 border-b border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950">
            <button
              onClick={() => setMobileRoomDropdown(!mobileRoomDropdown)}
              className="w-full flex items-center justify-between px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Hash size={11} className="text-gray-500 dark:text-gray-400" />
                <span className="text-[10px] font-bold">{(activeRoom && activeRoom.name) || 'Select Channel'}</span>
              </div>
              <ChevronDown size={11} className={`text-gray-400 transition-transform ${mobileRoomDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Rooms dropdown list */}
            {mobileRoomDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200/50 dark:border-gray-800/50 shadow-xl max-h-[50vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                {/* Search */}
                <div className="px-2 pt-1.5 pb-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1.5 text-gray-400" size={10} />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 rounded-md text-[9px] outline-none"
                    />
                  </div>
                </div>
                {/* Tabs */}
                <div className="px-2 flex gap-1 mb-1">
                  <button
                    onClick={() => setActiveTab('channels')}
                    className={`flex-1 py-0.5 rounded-md text-[7px] font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 border border-transparent apple-tab ${activeTab === 'channels' ? 'apple-tab-active' : 'apple-tab-inactive'}`}
                  >
                    <Hash size={8} />
                    Channels
                  </button>
                  <button
                    onClick={() => setActiveTab('dms')}
                    className={`flex-1 py-0.5 rounded-md text-[7px] font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 border border-transparent apple-tab ${activeTab === 'dms' ? 'apple-tab-active' : 'apple-tab-inactive'}`}
                  >
                    <UserPlus size={8} />
                    Directs
                  </button>
                </div>
                {/* List */}
                <div className="px-1.5 pb-1.5 space-y-0.5">
                  {activeTab === 'channels' ? (
                    filteredChannels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => { setActiveRoom(ch); setMobileRoomDropdown(false); }}
                        className={`w-full flex items-center gap-1.5 p-1.5 rounded-md text-left ${activeRoom?.id === ch.id ? 'bg-gray-900/10 dark:bg-gray-800/50 font-bold' : ''}`}
                      >
                        <Hash size={10} className="text-gray-500 shrink-0" />
                        <span className="text-[9px] truncate">#{ch.name}</span>
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        onClick={() => { handleOpenDMModal(); setMobileRoomDropdown(false); }}
                        className="w-full flex items-center gap-1.5 p-1.5 rounded-md text-left border border-dashed border-gray-300 dark:border-gray-700 text-[9px]"
                      >
                        <Plus size={10} />
                        Start Developer Chat
                      </button>
                      {filteredDms.map((dm) => {
                        const isUserOnline = onlineUsers.includes(dm.other_user_id);
                        return (
                          <button
                            key={dm.id}
                            onClick={() => { setActiveRoom(dm); setMobileRoomDropdown(false); }}
                            className={`w-full flex items-center gap-1.5 p-1.5 rounded-md text-left ${activeRoom?.id === dm.id ? 'bg-gray-900/10 dark:bg-gray-800/50 font-bold' : ''}`}
                          >
                            <div className="h-4 w-4 rounded-sm bg-black text-white font-bold flex items-center justify-center text-[7px] uppercase shrink-0">
                              {dm.name?.charAt(0) || '?'}
                            </div>
                            <div className="truncate min-w-0">
                              <span className="text-[9px] truncate block">{dm.name}</span>
                              {isUserOnline && <span className="text-[7px] text-emerald-500 font-semibold">Online</span>}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-0">
            {/* Chat Messages — TV frame on desktop, full-screen on mobile */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden md:p-3 md:bg-gray-900 md:dark:bg-gray-950 md:rounded-3xl md:shadow-2xl md:shadow-black/40 md:mx-auto md:mt-2 md:border md:border-gray-800/50 md:max-w-6xl md:w-full md:max-h-[85vh]">
            {/* Screen top glow — hidden on mobile */}
            <div className="hidden md:block h-0.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent rounded-full" />
            {/* Messages screen */}
            <div className="flex-1 flex flex-col md:bg-white md:dark:bg-gray-950 md:rounded-2xl min-h-0">
              <div className="flex-1 overflow-y-auto p-1.5 md:p-4 space-y-1 md:space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const isCodeMsg = msg.message_type === 'code';
                  const isImgMsg = msg.message_type === 'image';

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-[1px] md:gap-3 max-w-full ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      {!isMe && (
                        <div className="shrink-0 mt-0.5">
                          {msg.sender_avatar ? (
                            <img
                              src={normalizeUrl(msg.sender_avatar)}
                              alt={msg.sender_username}
                              className="h-3 w-3 md:h-8 md:w-8 rounded-sm object-cover"
                            />
                          ) : (
                            <div className="h-3 w-3 md:h-8 md:w-8 rounded-sm bg-black text-white font-bold flex items-center justify-center text-[5px] md:text-xs uppercase">
                              {msg.sender_name.charAt(0)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="space-y-0.5 md:space-y-1 min-w-0 max-w-[70%] md:max-w-none">
                        {/* Name header */}
                        {!isMe && (
                          <span className="text-[5px] md:text-[10px] text-gray-400 font-semibold block px-0.5">
                            {msg.sender_name} @{msg.sender_username}
                          </span>
                        )}

                        {/* Bubble body */}
                        <div
                          className={`p-[2px] md:p-2.5 rounded-[3px] md:rounded-xl shadow-sm text-[7px] md:text-xs border ${
                            isMe
                              ? 'bg-gray-900/10 border-gray-900/15 text-gray-950 dark:text-gray-100 rounded-tr-none'
                              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                          }`}
                        >
                          {/* Image Message */}
                          {isImgMsg && (
                            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                              <img
                                src={normalizeUrl(msg.content)}
                                alt="Attachment"
                                className="max-w-full max-h-60 object-contain hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                              />
                            </div>
                          )}

                          {/* Code Block Message (VS Code style) */}
                              {isCodeMsg &&
                            (() => {
                              const { language, code } = parseCodeBlock(msg.content);
                              const codeLines = code.split('\n');
                              const isCopied = copiedId === msg.id;
                              return (
                                <div
                                  className="rounded-[3px] md:rounded-xl overflow-hidden mt-0.5 md:mt-1 max-w-lg shadow-2xl shadow-black/40 ring-1 ring-white/5"
                                  style={{ backgroundColor: '#1b1d2e' }}
                                >
                                  {/* Header */}
                                  <div
                                    className="flex items-center justify-between px-1 md:px-4 py-0.5 md:py-2"
                                    style={{
                                      backgroundColor: '#16182a',
                                      borderBottom: '1px solid #2c2f4a',
                                    }}
                                  >
                                    <div className="flex items-center gap-1 md:gap-3">
                                      <div className="hidden md:flex gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                                      </div>
                                      <span
                                        className="flex items-center gap-0.5 md:gap-1 text-[6px] md:text-[10px] font-bold uppercase tracking-wider"
                                        style={{ color: '#7a7f9e' }}
                                      >
                                        <Code2 size={6} style={{ color: '#7ec8e3' }} />
                                        {language}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(code, msg.id)}
                                      className="flex items-center gap-0.5 md:gap-1 px-0.5 md:px-2 py-0.5 rounded-[2px] md:rounded-md text-[6px] md:text-[10px] font-medium transition-all"
                                      style={{ color: '#5a5f7a', backgroundColor: 'transparent' }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#c8d3f5';
                                        e.currentTarget.style.backgroundColor = '#2c2f4a';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#5a5f7a';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check size={5} style={{ color: '#7ec8e3' }} />
                                          <span style={{ color: '#7ec8e3' }}>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={5} />
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  {/* Code body with line numbers */}
                                  <div className="flex overflow-x-auto">
                                    <div
                                      className="select-none text-right pr-1 md:pr-3 pl-1 md:pl-3 py-1 md:py-3 text-[7px] md:text-[11px] leading-relaxed font-mono shrink-0"
                                      style={{
                                        color: '#3e4156',
                                        backgroundColor: '#1b1d2e',
                                        minWidth: '20px',
                                      }}
                                    >
                                      {codeLines.map((_, i) => (
                                        <div key={i} className={i === 0 ? 'relative' : ''}>
                                          {i === 0 && (
                                            <span
                                              className="absolute right-3 w-full h-full"
                                              style={{ borderRight: '1px solid #2c2f4a' }}
                                            />
                                          )}
                                          {i + 1}
                                        </div>
                                      ))}
                                    </div>
                                    <pre
                                      className="py-1 md:py-3 pr-1.5 md:pr-4 overflow-x-auto text-[7px] md:text-[11.5px] font-mono leading-relaxed tracking-wide"
                                      style={{ color: '#c8d3f5', backgroundColor: '#1b1d2e' }}
                                    >
                                      <code>{code}</code>
                                    </pre>
                                  </div>
                                </div>
                              );
                            })()}

                          {/* Text Message */}
                          {!isCodeMsg && !isImgMsg && (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          )}
                        </div>

                        {/* Meta information */}
                        <div
                          className={`flex items-center gap-1 px-0.5 text-[5px] md:text-[9px] text-gray-400 ${isMe ? 'justify-end' : ''}`}
                        >
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && <CheckCheck size={8} className="text-gray-900" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicators */}
                {roomTypingUsers.length > 0 && (
                  <div className="flex items-center gap-1 md:gap-1.5 text-[8px] md:text-xs text-gray-400 px-1 md:px-10 py-0.5">
                    <div className="flex gap-0.5 md:gap-1">
                      <span className="h-1 w-1 rounded-full bg-gray-400 animate-bounce"></span>
                      <span
                        className="h-1 w-1 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></span>
                      <span
                        className="h-1 w-1 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></span>
                    </div>
                    <span>{roomTypingUsers.join(', ')} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input bar at bottom of TV screen */}
              <div className="relative p-1.5 md:p-4 border-t border-gray-200 dark:border-gray-800">
                {/* Emojis selector list */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-1 p-2 rounded-xl glass-premium border border-gray-200/30 dark:border-gray-800/50 grid grid-cols-7 gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200 z-20 max-w-[220px]">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setInputText((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="h-7 w-7 md:h-9 md:w-9 rounded-lg md:rounded-xl flex items-center justify-center text-sm md:text-lg apple-btn"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Image Upload Input (Hidden) */}
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex items-center gap-1">
                    {/* Emoji Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="h-6 md:h-9 w-6 md:w-9 flex items-center justify-center apple-btn apple-btn-icon"
                    >
                      <Smile size={12} />
                    </button>

                    {/* Code Editor Modal Trigger */}
                    <button
                      type="button"
                      onClick={openCodeEditor}
                      className="h-6 md:h-9 w-6 md:w-9 flex items-center justify-center apple-btn apple-btn-icon"
                      title="Open Code Editor"
                    >
                      <Code size={12} />
                    </button>

                    {/* Image attachment */}
                    <button
                      type="button"
                      onClick={handleImageUploadClick}
                      disabled={uploadingImage}
                      className="h-6 md:h-9 w-6 md:w-9 flex items-center justify-center apple-btn apple-btn-icon disabled:opacity-50"
                      title="Upload Image"
                    >
                      {uploadingImage ? (
                        <span className="h-2.5 md:h-4 w-2.5 md:w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></span>
                      ) : (
                        <ImageIcon size={12} />
                      )}
                    </button>
                  </div>

                  {/* Text input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Talk as engineer..."
                    className="flex-1 min-w-0 px-2 md:px-3 py-1 md:py-2 rounded-lg md:rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 outline-none text-[9px] md:text-xs transition-all"
                    required
                    autoComplete="off"
                  />

                  {/* Send */}
                  <button
                    type="submit"
                    className="h-6 md:h-9 px-1.5 md:px-4 flex items-center justify-center shrink-0 apple-btn apple-btn-gradient"
                  >
                    <span className="text-[8px] md:text-[11px] font-semibold tracking-[0.1em] uppercase">Send</span>
                  </button>
                </form>
              </div>
            </div>

            {/* TV bottom bar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900/90 border-t border-gray-800/50 rounded-b-2xl">
              <span className="text-[9px] font-bold tracking-[0.25em] text-gray-600 uppercase">
                DEVROOM
              </span>
              <button
                className="h-5 w-5 bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center apple-btn apple-btn-icon"
                title="Power"
              >
                <span className="h-2 w-2 rounded-full bg-gray-400" />
              </button>
            </div>
          </div>
        </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {/* Mobile room selector dropdown */}
          <div className="md:hidden relative shrink-0 border-b border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950">
            <button
              onClick={() => setMobileRoomDropdown(!mobileRoomDropdown)}
              className="w-full flex items-center justify-between px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Hash size={11} className="text-gray-500 dark:text-gray-400" />
                <span className="text-[10px] font-bold">Select Channel</span>
              </div>
              <ChevronDown size={11} className={`text-gray-400 transition-transform ${mobileRoomDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Rooms dropdown list */}
            {mobileRoomDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200/50 dark:border-gray-800/50 shadow-xl max-h-[50vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                {/* Search */}
                <div className="px-2 pt-1.5 pb-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1.5 text-gray-400" size={10} />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 rounded-md text-[9px] outline-none"
                    />
                  </div>
                </div>
                {/* Tabs */}
                <div className="px-2 flex gap-1 mb-1">
                  <button
                    onClick={() => setActiveTab('channels')}
                    className={`flex-1 py-0.5 rounded-md text-[7px] font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 border border-transparent apple-tab ${activeTab === 'channels' ? 'apple-tab-active' : 'apple-tab-inactive'}`}
                  >
                    <Hash size={8} />
                    Channels
                  </button>
                  <button
                    onClick={() => setActiveTab('dms')}
                    className={`flex-1 py-0.5 rounded-md text-[7px] font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 border border-transparent apple-tab ${activeTab === 'dms' ? 'apple-tab-active' : 'apple-tab-inactive'}`}
                  >
                    <UserPlus size={8} />
                    Directs
                  </button>
                </div>
                {/* List */}
                <div className="px-1.5 pb-1.5 space-y-0.5">
                  {activeTab === 'channels' ? (
                    filteredChannels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => { setActiveRoom(ch); setMobileRoomDropdown(false); }}
                        className={`w-full flex items-center gap-1.5 p-1.5 rounded-md text-left ${activeRoom?.id === ch.id ? 'bg-gray-900/10 dark:bg-gray-800/50 font-bold' : ''}`}
                      >
                        <Hash size={10} className="text-gray-500 shrink-0" />
                        <span className="text-[9px] truncate">#{ch.name}</span>
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        onClick={() => { handleOpenDMModal(); setMobileRoomDropdown(false); }}
                        className="w-full flex items-center gap-1.5 p-1.5 rounded-md text-left border border-dashed border-gray-300 dark:border-gray-700 text-[9px]"
                      >
                        <Plus size={10} />
                        Start Developer Chat
                      </button>
                      {filteredDms.map((dm) => {
                        const isUserOnline = onlineUsers.includes(dm.other_user_id);
                        return (
                          <button
                            key={dm.id}
                            onClick={() => { setActiveRoom(dm); setMobileRoomDropdown(false); }}
                            className={`w-full flex items-center gap-1.5 p-1.5 rounded-md text-left ${activeRoom?.id === dm.id ? 'bg-gray-900/10 dark:bg-gray-800/50 font-bold' : ''}`}
                          >
                            <div className="h-4 w-4 rounded-sm bg-black text-white font-bold flex items-center justify-center text-[7px] uppercase shrink-0">
                              {dm.name?.charAt(0) || '?'}
                            </div>
                            <div className="truncate min-w-0">
                              <span className="text-[9px] truncate block">{dm.name}</span>
                              {isUserOnline && <span className="text-[7px] text-emerald-500 font-semibold">Online</span>}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-2xl bg-gray-900/10 text-gray-900 flex items-center justify-center mb-4">
              <Terminal size={32} />
            </div>
            <h3 className="text-lg font-bold">Select a DevRoom discussion</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-2">
              Join any technology channel on the left sidebar, or open a direct chat session with
              another engineer.
            </p>
          </div>
        </div>
      )}

      {/* 3. DM MODAL */}
      {dmModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-premium rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-gray-800/60 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                Start Developer Conversation
              </h3>
              <button onClick={() => setDmModalOpen(false)} className="apple-btn apple-btn-icon">
                <X size={20} />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or @username..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl text-xs outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            {/* Users listing - online first */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {filteredUsers.length > 0 ? (
                <>
                  {filteredUsers.filter((u) => onlineUsers.includes(u.id)).length > 0 && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 px-1 mb-1 mt-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
                      Online
                    </p>
                  )}
                  {filteredUsers
                    .filter((u) => onlineUsers.includes(u.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleCreateDM(u.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left apple-btn apple-btn-ghost"
                      >
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img
                              src={normalizeUrl(u.avatar_url)}
                              alt={u.username}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-black text-white font-bold flex items-center justify-center text-xs uppercase">
                              {u.first_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold leading-none">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-[10px] text-gray-900 dark:text-gray-100 mt-1 leading-none font-medium">
                              @{u.username} &middot; <span className="text-emerald-500 font-semibold">Online</span>
                            </p>
                          </div>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                      </button>
                    ))}
                  {filteredUsers.filter((u) => !onlineUsers.includes(u.id)).length > 0 && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-1 mt-3">
                      Offline
                    </p>
                  )}
                  {filteredUsers
                    .filter((u) => !onlineUsers.includes(u.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleCreateDM(u.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left apple-btn apple-btn-ghost"
                      >
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img
                              src={normalizeUrl(u.avatar_url)}
                              alt={u.username}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-black text-white font-bold flex items-center justify-center text-xs uppercase">
                              {u.first_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold leading-none">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-none">
                              @{u.username} &middot; Offline
                            </p>
                          </div>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-gray-300"></span>
                      </button>
                    ))}
                </>
              ) : (
                <p className="text-center text-xs text-gray-400 py-6">No other developers found.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Code Editor Modal (Noctis Obscuro theme) */}
      {showCodeEditor && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div
            className="w-full max-w-3xl mx-4 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-in zoom-in-95 duration-200 flex flex-col"
            style={{ backgroundColor: '#1b1d2e', height: '70vh' }}
          >
            {/* Title bar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ backgroundColor: '#16182a', borderBottom: '1px solid #2c2f4a' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-sm shadow-[#ff5f57]/30" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-sm shadow-[#febc2e]/30" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-sm shadow-[#28c840]/30" />
                </div>
                <span
                  className="text-xs font-medium flex items-center gap-2 ml-2"
                  style={{ color: '#7a7f9e' }}
                >
                  <Code2 size={14} style={{ color: '#7ec8e3' }} />
                  code-snippet — DevRoom
                </span>
              </div>
              <button
                onClick={() => setShowCodeEditor(false)}
                className="h-8 w-8 flex items-center justify-center hover:bg-white/10 apple-btn apple-btn-icon"
                style={{ color: '#7a7f9e' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#c8d3f5')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#7a7f9e')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Language bar */}
            <div
              className="flex items-center gap-2 px-5 py-2"
              style={{ backgroundColor: '#16182a', borderBottom: '1px solid #2c2f4a' }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider mr-1"
                style={{ color: '#5a5f7a' }}
              >
                Language
              </span>
              <select
                value={codeEditorLang}
                onChange={(e) => setCodeEditorLang(e.target.value)}
                className="text-xs px-3 py-1 rounded-md border outline-none cursor-pointer transition-colors"
                style={{ backgroundColor: '#2c2f4a', color: '#c8d3f5', borderColor: '#3e4156' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#5a5f7a')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3e4156')}
              >
                {codeLanguages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              {codeEditorContent.trim() && (
                <span className="text-[10px] ml-auto" style={{ color: '#5a5f7a' }}>
                  Auto-detected:{' '}
                  <span style={{ color: '#7ec8e3' }} className="font-medium">
                    {detectLanguage(codeEditorContent)}
                  </span>
                </span>
              )}
            </div>

            {/* Code textarea */}
            <textarea
              ref={codeEditorTextareaRef}
              value={codeEditorContent}
              onChange={handleCodeEditorChange}
              className="flex-1 w-full p-5 font-mono text-sm outline-none resize-none"
              style={{ backgroundColor: '#1b1d2e', color: '#c8d3f5' }}
              placeholder="// Write your code here..."
              spellCheck={false}
            />

            {/* Footer actions */}
            <div
              className="flex items-center justify-end gap-3 px-5 py-3"
              style={{ backgroundColor: '#16182a', borderTop: '1px solid #2c2f4a' }}
            >
              <button
                onClick={() => setShowCodeEditor(false)}
                className="px-4 py-1.5 rounded-md text-xs font-medium apple-btn"
                style={{ color: '#7a7f9e', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#c8d3f5';
                  e.currentTarget.style.backgroundColor = '#2c2f4a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#7a7f9e';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCodeSend}
                disabled={!codeEditorContent.trim()}
                className="px-5 py-1.5 rounded-md text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed apple-btn"
                style={{ backgroundColor: '#3e4156' }}
                onMouseEnter={(e) => {
                  if (!codeEditorContent.trim()) return;
                  e.currentTarget.style.backgroundColor = '#4a4d6a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3e4156';
                }}
              >
                Insert Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal (admin) */}
      {createChannelOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-premium rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-gray-800/60 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                Create Channel
              </h3>
              <button
                onClick={() => setCreateChannelOpen(false)}
                className="apple-btn apple-btn-icon"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Channel name (e.g. frontend)"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl text-xs outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCreateChannelOpen(false)}
                className="px-3 py-2 rounded-xl text-sm apple-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                className="px-3 py-2 rounded-xl text-sm font-medium apple-btn apple-btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal (admin) */}
      {editChannelOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-premium rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-gray-800/60 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                Rename Channel
              </h3>
              <button
                onClick={() => setEditChannelOpen(false)}
                className="apple-btn apple-btn-icon"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={editChannelName}
                onChange={(e) => setEditChannelName(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl text-xs outline-none focus:border-gray-900 transition-colors"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditChannelOpen(false)}
                className="px-3 py-2 rounded-xl text-sm apple-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleEditChannel}
                className="px-3 py-2 rounded-xl text-sm font-medium apple-btn apple-btn-primary"
              >
                Save
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

export default Chat;
