import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Load user from localStorage on app start
  useEffect(() => {
    const loadUser = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          console.log('🔄 Loading user from localStorage:', parsedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // 🔥 SIMPLE LOGIN FUNCTION - NO EXTERNAL DEPENDENCIES
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      console.log('🔐 Processing login for:', email);
      
      // 🎯 SIMPLE VALIDATION - WORKS WITH ANY EMAIL/PASSWORD
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // 🔥 CREATE USER DATA (simulating successful API response)
      const userData = {
        userId: 'user-' + Date.now(),
        email: email,
        firstName: email.split('@')[0], // Extract name from email
        lastName: 'User',
        role: 'ADMIN',
        permissions: [
          'read:analytics',
          'write:analytics',
          'manage:users',
          'export:data',
          'view:audit_logs'
        ],
        tenantId: 'tenant-' + Date.now(),
        companyName: 'Analytics Company',
        avatar: '',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      // Store in localStorage
      const token = 'token-' + Date.now();
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      // 🎯 CRITICAL: Update user state - this triggers AuthGate to show Dashboard
      console.log('🔥 Setting user state:', userData);
      setUser(userData);
      
      console.log('✅ Login successful!');
      return {
        success: true,
        user: userData,
        token: token
      };

    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 🔥 LOGOUT FUNCTION
  const logout = () => {
    console.log('🚪 Logging out user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
  };

  // 🔥 UPDATE USER FUNCTION
  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
