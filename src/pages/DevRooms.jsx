import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, ExternalLink, Trash2, GitBranch, Code, Globe, Calendar, X, Users, Monitor, MonitorOff, Video, VideoOff, ArrowLeft, User, Wifi, WifiOff, Maximize, Minimize, Mic, MicOff, Camera, CameraOff, Signal, SignalHigh, SignalMedium, SignalLow } from 'lucide-react';

// Metered.ca TURN credentials — fetched via REST API for fresh time-limited tokens
const TURN_API_KEY = '9d9520343ae0cd35f465ac329f5bfd8a4e5a';
const TURN_API_URL = 'https://devroom.metered.live/api/v1/turn/credentials';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const FALLBACK_ICE = {
  iceServers: [
    ...STUN_SERVERS,
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '597a69ba53168c57effc61d1',
      credential: '8fRZeqDDpFHRWujD',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '597a69ba53168c57effc61d1',
      credential: '8fRZeqDDpFHRWujD',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '597a69ba53168c57effc61d1',
      credential: '8fRZeqDDpFHRWujD',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '597a69ba53168c57effc61d1',
      credential: '8fRZeqDDpFHRWujD',
    },
  ],
  iceCandidatePoolSize: 10,
};

const QUALITY_PRESETS = {
  '720p': { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  'source': { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 60 } },
};

const DevRooms = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', pendingId: null });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Room detail view
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [joined, setJoined] = useState(false);

  // Broadcasting
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcasterInfo, setBroadcasterInfo] = useState(null);
  const [isViewer, setIsViewer] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);       // Viewer's single peer connection to broadcaster
  const peerConnectionsRef = useRef({}); // Broadcaster's map: {viewerId: RTCPeerConnection}
  const isBroadcastingRef = useRef(false);
  const localStreamRef = useRef(null);
  const selectedRoomRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const fullscreenRef = useRef(null);

  const [broadcastQuality, setBroadcastQuality] = useState('1080p');
  const [streamSource, setStreamSource] = useState('screen');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(null);
  const [iceServers, setIceServers] = useState(FALLBACK_ICE);
  const iceServersRef = useRef(FALLBACK_ICE);

  const toggleFullscreen = async () => {
    const el = fullscreenRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keep refs in sync
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  // Sync local stream to video element when broadcaster view renders
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isBroadcasting, localVideoRef]);

  // Clean up WebRTC on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
      if (selectedRoom && joined && socket) {
        socket.emit('leave_dev_room', { room_id: selectedRoom.id });
      }
    };
  }, []);

  // Fetch fresh TURN credentials from Metered.ca
  useEffect(() => {
    fetch(`${TURN_API_URL}?apiKey=${TURN_API_KEY}`)
      .then(r => r.json())
      .then(servers => {
        const ices = { iceServers: [...STUN_SERVERS, ...servers], iceCandidatePoolSize: 10 };
        setIceServers(ices);
        iceServersRef.current = ices;
      })
      .catch(() => {/* uses fallback */});
  }, []);

  const createPCForViewer = useCallback(async (viewerId) => {
    if (!localStreamRef.current) return null;
    try {
      // Close existing PC if any
      if (peerConnectionsRef.current[viewerId]) {
        peerConnectionsRef.current[viewerId].close();
      }
      const pc = new RTCPeerConnection(iceServersRef.current);
      peerConnectionsRef.current[viewerId] = pc;

      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') setConnectionQuality('good');
        else if (state === 'disconnected' || state === 'failed') setConnectionQuality('poor');
        else setConnectionQuality('connecting');
        if (state === 'failed' || state === 'disconnected') {
          console.warn(`WebRTC connection to viewer ${viewerId} ${state}`);
          delete peerConnectionsRef.current[viewerId];
        }
      };
      pc.onicecandidateerror = (e) => {
        console.error('ICE candidate error (broadcaster):', e.errorText, e.url);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && selectedRoomRef.current) {
          socket.emit('broadcast_ice_candidate', {
            room_id: selectedRoomRef.current.id,
            candidate: event.candidate,
            target_id: viewerId
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket && selectedRoomRef.current) {
        socket.emit('broadcast_offer', {
          room_id: selectedRoomRef.current.id,
          offer: pc.localDescription,
          target_id: viewerId
        });
      }
      return pc;
    } catch (err) {
      console.error('Error creating PC for viewer:', err);
      delete peerConnectionsRef.current[viewerId];
      return null;
    }
  }, [socket]);

  const stopAllMedia = useCallback(() => {
    isBroadcastingRef.current = false;
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setIsBroadcasting(false);
    setIsViewer(false);
    setBroadcasterInfo(null);
    setHasRemoteVideo(false);
    setConnectionQuality(null);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Socket listeners for broadcasting
  useEffect(() => {
    if (!socket || !selectedRoom) return;

    const handleBroadcastStarted = (data) => {
      setBroadcasterInfo(data);
      // If I'm not the broadcaster, request an offer from them
      if (data.broadcaster_id !== user?.id) {
        setIsViewer(true);
        if (selectedRoomRef.current) {
          socket.emit('request_offer', { room_id: selectedRoomRef.current.id });
        }
      }
    };

    const handleBroadcastStopped = () => {
      stopAllMedia();
    };

    // Viewer receives WebRTC offer from broadcaster
    const handleOffer = async (data) => {
      // Only process offers targeted at us (with target_id)
      if (!data.target_id || data.target_id !== user?.id) return;
      try {
        // Close previous peer connection if any
        if (peerRef.current) peerRef.current.close();
        setHasRemoteVideo(false);
        const peer = new RTCPeerConnection(iceServersRef.current);
        peerRef.current = peer;

        peer.ontrack = (event) => {
          const stream = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            setHasRemoteVideo(true);
            remoteVideoRef.current.play().catch(() => {});
          } else {
            // Retry when video element becomes available
            const checkVideo = setInterval(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                setHasRemoteVideo(true);
                remoteVideoRef.current.play().catch(() => {});
                clearInterval(checkVideo);
              }
            }, 200);
            setTimeout(() => clearInterval(checkVideo), 10000);
          }
        };

        peer.oniceconnectionstatechange = () => {
          const state = peer.iceConnectionState;
          if (state === 'connected' || state === 'completed') setConnectionQuality('good');
          else if (state === 'disconnected' || state === 'failed') setConnectionQuality('poor');
          else setConnectionQuality('connecting');
          if (state === 'connected' || state === 'completed') {
            console.log('WebRTC connected as viewer');
          } else if (state === 'failed') {
            console.error('WebRTC viewer connection FAILED — check ICE servers and network');
          }
        };
        peer.onicecandidateerror = (e) => {
          console.error('ICE candidate error (viewer):', e.errorText, e.url);
        };

        peer.onicecandidate = (event) => {
          if (event.candidate && selectedRoomRef.current) {
            socket.emit('broadcast_ice_candidate', {
              room_id: selectedRoomRef.current.id,
              candidate: event.candidate,
              target_id: null
            });
          }
        };

        await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        if (selectedRoomRef.current) {
          socket.emit('broadcast_answer', {
            room_id: selectedRoomRef.current.id,
            answer: peer.localDescription
          });
        }
      } catch (err) {
        console.error('WebRTC offer handling error:', err);
      }
    };

    // Broadcaster receives answer from a viewer (lookup by from_id in map)
    const handleAnswer = async (data) => {
      const pc = peerConnectionsRef.current[data.from_id];
      if (pc && pc.remoteDescription === null) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    };

    const handleIceCandidate = async (data) => {
      // If target_id is set, this is broadcaster→viewer; process as viewer
      if (data.target_id) {
        if (data.target_id === user?.id && peerRef.current && data.candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
        }
        return;
      }
      // No target_id means viewer→broadcaster; process as broadcaster
      if (data.from_id && isBroadcastingRef.current) {
        const pc = peerConnectionsRef.current[data.from_id];
        if (pc && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
        }
      }
    };

    // Broadcaster receives request_offer from a viewer → create PC for them
    const handleRequestOffer = async (data) => {
      if (isBroadcastingRef.current && data.requester_id !== user?.id) {
        await createPCForViewer(data.requester_id);
      }
    };

    const handleUserJoined = (data) => {
      setRoomUsers((prev) => {
        if (prev.find(u => u.user_id === data.user_id)) return prev;
        return [...prev, data];
      });
    };

    const handleUserLeft = (data) => {
      setRoomUsers((prev) => prev.filter(u => u.user_id !== data.user_id));
      // Clean up peer connection for this viewer if broadcasting
      if (isBroadcastingRef.current && peerConnectionsRef.current[data.user_id]) {
        peerConnectionsRef.current[data.user_id].close();
        delete peerConnectionsRef.current[data.user_id];
      }
    };

    socket.on('broadcast_started', handleBroadcastStarted);
    socket.on('broadcast_stopped', handleBroadcastStopped);
    socket.on('broadcast_offer', handleOffer);
    socket.on('broadcast_answer', handleAnswer);
    socket.on('broadcast_ice_candidate', handleIceCandidate);
    socket.on('request_offer', handleRequestOffer);
    socket.on('dev_room_user_joined', handleUserJoined);
    socket.on('dev_room_user_left', handleUserLeft);

    return () => {
      socket.off('broadcast_started', handleBroadcastStarted);
      socket.off('broadcast_stopped', handleBroadcastStopped);
      socket.off('broadcast_offer', handleOffer);
      socket.off('broadcast_answer', handleAnswer);
      socket.off('broadcast_ice_candidate', handleIceCandidate);
      socket.off('request_offer', handleRequestOffer);
      socket.off('dev_room_user_joined', handleUserJoined);
      socket.off('dev_room_user_left', handleUserLeft);
    };
  }, [socket, selectedRoom, user?.id, stopAllMedia, createPCForViewer]);

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/devrooms');
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await axios.post('/api/devrooms', {
        name: name.trim(),
        description: description.trim(),
        github_url: githubUrl.trim()
      });
      setShowCreate(false);
      setName('');
      setDescription('');
      setGithubUrl('');
      fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id) => {
    setConfirm({ open: true, title: 'Delete Dev Room', message: 'Are you sure you want to delete this dev room?', pendingId: id });
  };

  const handleConfirmDelete = async () => {
    const id = confirm.pendingId;
    setConfirm((prev) => ({ ...prev, open: false }));
    try {
      await axios.delete(`/api/devrooms/${id}`);
      if (selectedRoom?.id === id) {
        setSelectedRoom(null);
        if (joined) socket?.emit('leave_dev_room', { room_id: id });
        setJoined(false);
        stopAllMedia();
      }
      fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = (room) => {
    setSelectedRoom(room);
    setRoomUsers([]);
    setBroadcasterInfo(null);
    stopAllMedia();
    // Socket join handled below via useEffect
  };

  useEffect(() => {
    if (!socket || !selectedRoom) return;
    if (joined) {
      socket.emit('join_dev_room', { room_id: selectedRoom.id });
    }
  }, [joined, selectedRoom, socket]);

  const toggleJoin = () => {
    if (joined) {
      if (isBroadcasting) handleStopBroadcast();
      socket?.emit('leave_dev_room', { room_id: selectedRoom.id });
      setJoined(false);
      setRoomUsers([]);
    } else {
      setJoined(true);
      // Add self
      setRoomUsers([{ user_id: user?.id, username: user?.username }]);
    }
  };

  const setupStream = useCallback((stream, source) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    setStreamSource(source);
    isBroadcastingRef.current = true;
    socket.emit('start_broadcast', { room_id: selectedRoomRef.current.id });
    setIsBroadcasting(true);
  }, [socket]);

  const handleStartScreenBroadcast = async () => {
    try {
      const constraints = {
        video: { ...QUALITY_PRESETS[broadcastQuality] },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (isBroadcastingRef.current) handleStopBroadcast();
      });
      setupStream(stream, 'screen');
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        console.error('Screen broadcast error:', err);
      }
    }
  };

  const handleStartCameraBroadcast = async () => {
    try {
      const constraints = {
        video: { ...QUALITY_PRESETS[broadcastQuality === 'source' ? '1080p' : broadcastQuality] },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setupStream(stream, 'camera');
    } catch (err) {
      console.error('Camera broadcast error:', err);
    }
  };

  const handleStopBroadcast = () => {
    if (selectedRoomRef.current) {
      socket.emit('stop_broadcast', { room_id: selectedRoomRef.current.id });
    }
    stopAllMedia();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach(track => { track.enabled = !track.enabled; });
    setIsAudioMuted((prev) => !prev);
  };

  const handleSwitchSource = () => {
    if (!isBroadcastingRef.current) return;
    handleStopBroadcast();
  };

  const handleBack = () => {
    if (joined) {
      if (isBroadcasting) handleStopBroadcast();
      socket?.emit('leave_dev_room', { room_id: selectedRoom.id });
    }
    setSelectedRoom(null);
    setJoined(false);
    setRoomUsers([]);
    setBroadcasterInfo(null);
    stopAllMedia();
  };

  const isBroadcaster = isBroadcasting && broadcasterInfo?.broadcaster_id === user?.id;

  const hasSelectedRoom = selectedRoom !== null;

  // ── Room Detail View ─────────────────────────────────────────────────
  if (hasSelectedRoom) return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Room header */}
      <div className="glass-premium border-b border-gray-200/30 dark:border-gray-800/30 px-4 sm:px-6 py-3 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={handleBack} className="apple-btn apple-btn-ghost h-9 w-9 flex items-center justify-center dark:text-gray-300 shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="h-9 w-9 rounded-xl bg-gray-900/10 text-gray-900 dark:text-gray-100 flex items-center justify-center shrink-0">
              <Code size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold truncate text-gray-900 dark:text-gray-100">{selectedRoom.name}</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{selectedRoom.description || 'Development workspace'}</p>
            </div>
          </div>
          <button onClick={toggleJoin} className={`apple-button apple-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
            joined
              ? 'apple-btn-secondary dark:text-gray-300 border border-gray-900/20'
              : 'apple-btn-primary'
          }`}>
            {joined ? <><WifiOff size={14} /> Leave</> : <><Wifi size={14} /> Join</>}
          </button>
        </div>
      </div>

      {/* Room content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 p-4 sm:p-6 gap-6 overflow-y-auto">
        {/* Main broadcast area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 glass-premium rounded-2xl border border-white/20 dark:border-gray-800/60 overflow-hidden flex items-center justify-center min-h-[300px] lg:min-h-0 relative">
            {isBroadcaster ? (
              <div ref={fullscreenRef} className="absolute inset-0 bg-gray-900">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />

                {/* LIVE badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>

                {/* Stream info */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/80 text-[11px] font-medium">
                  <span>{streamSource === 'screen' ? 'Screen' : 'Camera'}</span>
                  <span className="w-px h-3 bg-white/20" />
                  <span>{broadcastQuality}</span>
                </div>

                {/* Connection quality */}
                {connectionQuality && (
                  <div className="absolute top-4 right-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                    {connectionQuality === 'good' ? <SignalHigh size={14} className="text-green-400" /> :
                     connectionQuality === 'poor' ? <SignalLow size={14} className="text-yellow-400" /> :
                     <Signal size={14} className="text-white/50 animate-pulse" />}
                    {connectionQuality === 'good' ? 'Good' :
                     connectionQuality === 'poor' ? 'Weak' : 'Connecting'}
                  </div>
                )}

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/20 transition-colors">
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>

                {/* Control bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl">
                  {streamSource === 'screen' ? (
                    <button onClick={handleStartCameraBroadcast} className="apple-btn apple-btn-ghost text-white/80 hover:text-white flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium" title="Switch to camera">
                      <Camera size={16} /> <span className="hidden sm:inline">Camera</span>
                    </button>
                  ) : (
                    <button onClick={handleStartScreenBroadcast} className="apple-btn apple-btn-ghost text-white/80 hover:text-white flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium" title="Switch to screen">
                      <Monitor size={16} /> <span className="hidden sm:inline">Screen</span>
                    </button>
                  )}

                  <div className="w-px h-6 bg-white/10" />

                  <button onClick={toggleMute} className={`h-9 px-3 flex items-center gap-2 rounded-xl text-xs font-medium transition-colors ${isAudioMuted ? 'text-red-400 hover:bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                    {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    <span className="hidden sm:inline">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
                  </button>

                  <div className="w-px h-6 bg-white/10" />

                  {['720p', '1080p', 'Source'].map((q) => {
                    const val = q === 'Source' ? 'source' : q;
                    return (
                      <button key={q} onClick={() => setBroadcastQuality(val)} className={`h-9 px-2.5 rounded-xl text-[11px] font-semibold transition-colors ${
                        broadcastQuality === val
                          ? 'bg-white/15 text-white'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      }`}>{q}</button>
                    );
                  })}

                  <div className="w-px h-6 bg-white/10" />

                  <button onClick={handleStopBroadcast} className="apple-btn apple-btn-danger flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold">
                    <MonitorOff size={16} /> <span className="hidden sm:inline">Stop</span>
                  </button>
                </div>
              </div>
            ) : isViewer ? (
              <div ref={fullscreenRef} className="absolute inset-0 bg-gray-900">
                <video ref={remoteVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" onLoadedMetadata={(e) => { e.target.play().catch(() => {}); }} />
                {!hasRemoteVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                    <span className="text-xs font-medium text-white/60">Connecting to stream...</span>
                  </div>
                )}

                <div className="absolute top-4 left-4 flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/10">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Watching {broadcasterInfo?.broadcaster_username}
                </div>

                {connectionQuality && hasRemoteVideo && (
                  <div className="absolute top-4 right-14 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                    {connectionQuality === 'good' ? <SignalHigh size={14} className="text-green-400" /> :
                     connectionQuality === 'poor' ? <SignalLow size={14} className="text-yellow-400" /> :
                     <Signal size={14} className="text-white/50 animate-pulse" />}
                  </div>
                )}

                <button onClick={toggleFullscreen} className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/20 transition-colors">
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4">
                  <Monitor size={32} className="text-gray-400 dark:text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">
                  {joined ? 'No live broadcast' : 'Join the room to see broadcasts'}
                </h3>
                <p className="text-sm text-gray-400 mt-1 max-w-sm">
                  {joined
                    ? 'Be the first to broadcast your screen or wait for someone else to go live.'
                    : 'Click "Join" above to participate in this development workspace.'}
                </p>
                {joined && (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={handleStartScreenBroadcast} className="apple-button apple-btn apple-btn-primary flex items-center gap-2.5 px-6 py-3 text-sm font-semibold">
                        <Monitor size={20} />
                        Share Screen
                      </button>
                      <button onClick={handleStartCameraBroadcast} className="apple-button apple-btn apple-btn-primary flex items-center gap-2.5 px-6 py-3 text-sm font-semibold">
                        <Camera size={20} />
                        Share Camera
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-medium">Quality:</span>
                      {['720p', '1080p', 'source'].map((q) => (
                        <button key={q} onClick={() => setBroadcastQuality(q)} className={`apple-btn px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                          broadcastQuality === q
                            ? 'bg-gray-900 text-white dark:border dark:border-white/20'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}>{q === 'source' ? 'Source' : q}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Users in room */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="glass-premium rounded-2xl p-4 border border-white/20 dark:border-gray-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <Users size={14} />
              In Room
              <span className="ml-auto text-[10px] font-normal text-gray-400">{roomUsers.length}</span>
            </h3>
            <div className="space-y-1.5">
              {roomUsers.map((u) => {
                const isBroadcasting = broadcasterInfo?.broadcaster_id === u.user_id;
                const isMe = u.user_id === user?.id;
                return (
                  <div key={u.user_id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-gray-900/10 text-gray-900 dark:text-gray-100 font-bold flex items-center justify-center text-[10px] uppercase shrink-0">
                      {u.username?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">
                        {u.username}
                        {isMe && <span className="text-[10px] text-gray-400 ml-1">(you)</span>}
                      </p>
                    </div>
                    {isBroadcasting && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900/10 text-gray-500 text-[9px] font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                );
              })}
              {roomUsers.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No one here yet</p>
              )}
            </div>
          </div>

          <div className="glass-premium rounded-2xl p-4 border border-white/20 dark:border-gray-800/60 mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Info</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">{selectedRoom.description || 'No description'}</p>
            {selectedRoom.github_url && (
              <a href={selectedRoom.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-900/10 hover:text-gray-900 transition-colors inline-flex">
                <GitBranch size={14} /> GitHub <ExternalLink size={12} />
              </a>
            )}
            <p className="text-[10px] text-gray-400 mt-4">
              Created by {selectedRoom.creator_name} · {new Date(selectedRoom.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Room List View ─────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-900/10 text-gray-900 flex items-center justify-center">
                <Code size={24} />
              </div>
              Dev Rooms
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 ml-[52px]">
              Create development rooms and share your screen with your team
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="apple-button apple-btn apple-btn-primary flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold w-full sm:w-auto"
          >
            <Plus size={18} />
            New Room
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => handleJoinRoom(room)}
              className="apple-card glass-premium rounded-2xl p-5 border border-white/20 dark:border-gray-800/60 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base truncate group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{room.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 flex-wrap">
                    <Calendar size={12} />
                    {new Date(room.created_at).toLocaleDateString()}
                    <span className="mx-1">by</span>
                    <span className="truncate">{room.creator_name}</span>
                  </p>
                </div>
                {(user?.role === 'admin' || room.creator_id === user?.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(room.id); }}
                    className="apple-btn apple-btn-icon p-1.5 dark:text-gray-300 shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {room.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{room.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {room.github_url && (
                  <a
                    href={room.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-900/10 hover:text-gray-900 transition-colors"
                  >
                    <GitBranch size={14} />
                    GitHub
                    <ExternalLink size={12} />
                  </a>
                )}
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900/10 text-gray-900 dark:text-gray-100 text-xs font-medium">
                  <Monitor size={14} />
                  Live
                </span>
              </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mx-auto mb-4">
                <Code size={32} className="text-gray-400" />
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">No dev rooms yet</p>
              <p className="text-sm text-gray-400 mt-1">Create the first one to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 apple-appear">
          <div className="w-full max-w-lg mx-4 glass-dark rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">Create Dev Room</h3>
              <button onClick={() => setShowCreate(false)} className="apple-btn apple-btn-icon h-8 w-8 flex items-center justify-center dark:text-gray-300">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Room name (e.g. AI Chat Project)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-gray-900 outline-none text-sm text-white placeholder-gray-500 transition-colors"
                required
              />
              <textarea
                placeholder="Short description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-gray-900 outline-none text-sm text-white placeholder-gray-500 transition-colors resize-none"
              />
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <GitBranch size={18} />
                </span>
                <input
                  type="url"
                  placeholder="GitHub repo URL (optional)"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-gray-900 outline-none text-sm text-white placeholder-gray-500 transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="apple-btn apple-btn-ghost px-4 py-2.5 text-sm dark:text-gray-300">Cancel</button>
                <button type="submit" className="apple-btn apple-btn-primary px-4 py-2.5 text-sm font-semibold">Create Room</button>
              </div>
            </form>
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

export default DevRooms;
