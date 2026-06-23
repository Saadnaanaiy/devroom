import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Set base URL for all API requests (VITE_API_URL or Vite proxy fallback)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';
// Bypass ngrok browser warning
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('devroom-token'));
  const [loading, setLoading] = useState(true);

  // Axios interceptor: on 401, auto-logout (token expired)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          logout();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Sync axios header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data.user);
      } catch (error) {
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem('devroom-token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (error) {
      throw error.response?.data?.message || "Login failed.";
    }
  };

  const register = async (formData) => {
    try {
      const response = await axios.post('/api/auth/register', formData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Registration failed.";
    }
  };

  const logout = () => {
    localStorage.removeItem('devroom-token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const sendVerification = async () => {
    try {
      const response = await axios.post('/api/auth/send-verification');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Failed to send verification email.";
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await axios.put('/api/auth/profile', data);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Failed to update profile.";
    }
  };

  const updateAvatar = async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await axios.post('/api/auth/upload-avatar', formData);
      setUser(response.data.user);
      return response.data.avatar_url;
    } catch (error) {
      throw error.response?.data?.message || "Failed to upload avatar.";
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, sendVerification, updateProfile, updateAvatar, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
