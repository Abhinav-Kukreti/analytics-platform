import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';

// 🔥 MAGIC COMPONENT - Shows Login OR Dashboard
const AuthGate = () => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // 🎯 SIMPLE: If logged in, show Dashboard. If not, show Login.
  return user ? <Dashboard /> : <Login />;
};

// 🔒 Simple protection for other pages
const SimpleProtected = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  // If not logged in, show login instead
  return user ? children : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 🏠 Home page - automatically shows right screen */}
          <Route path="/" element={<AuthGate />} />
          
          {/* 📊 Dashboard - also protected */}
          <Route path="/dashboard" element={<AuthGate />} />
          
          {/* 👤 Profile - protected */}
          <Route path="/profile" element={
            <SimpleProtected>
              <UserProfile />
            </SimpleProtected>
          } />
          
          {/* 🔐 Login page - explicit */}
          <Route path="/login" element={<Login />} />
          
          {/* 🌟 Any other page - goes to AuthGate */}
          <Route path="*" element={<AuthGate />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
