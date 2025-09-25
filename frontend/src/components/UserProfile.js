import React, { useState, useEffect } from 'react';

const UserProfile = () => {
  console.log('🔍 UserProfile component is rendering!');
  
  const [profile, setProfile] = useState({
    firstName: 'Demo',
    lastName: 'User', 
    email: 'demo@example.com',
    role: 'Viewer',
    avatar: '',
    theme: localStorage.getItem('theme') || 'light', // Load saved theme
    notifications: true
  });

  // 🔥 DARK THEME FUNCTIONALITY - ACTUALLY WORKS!
  useEffect(() => {
    console.log('🎨 Applying theme:', profile.theme);
    
    if (profile.theme === 'dark') {
      // Apply dark theme
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937';
      document.body.style.color = '#f9fafb';
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      // Save theme preference
      localStorage.setItem('theme', 'dark');
      console.log('🌙 Dark theme applied!');
      
    } else {
      // Apply light theme  
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f9fafb';
      document.body.style.color = '#111827';
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      // Save theme preference
      localStorage.setItem('theme', 'light');
      console.log('☀️ Light theme applied!');
    }
  }, [profile.theme]);

  // Handle theme change
  const handleThemeChange = (newTheme) => {
    console.log('🔄 Changing theme to:', newTheme);
    setProfile({...profile, theme: newTheme});
  };

  const handleSave = () => {
    console.log('💾 Saving profile:', profile);
    
    // Save all profile data to localStorage
    localStorage.setItem('userProfile', JSON.stringify(profile));
    
    alert(`Profile saved successfully! 
    
✅ Name: ${profile.firstName} ${profile.lastName}
🎨 Theme: ${profile.theme}
📧 Notifications: ${profile.notifications ? 'Enabled' : 'Disabled'}

(Demo mode - changes are saved locally)`);
  };

  // Dynamic classes based on theme
  const isDark = profile.theme === 'dark';
  const bgClass = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const cardBgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgClass} py-8 transition-all duration-300`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${textClass}`}>👤 User Profile</h1>
          <p className={`${textSecondaryClass} mt-2`}>Manage your account settings and preferences</p>
        </div>

        {/* Main Profile Card */}
        <div className={`${cardBgClass} rounded-lg shadow-lg overflow-hidden transition-all duration-300`}>
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
            <div className="flex items-center">
              {/* Avatar */}
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </div>
              
              {/* User Info */}
              <div className="ml-6 text-white">
                <h2 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h2>
                <p className="text-indigo-100">{profile.email}</p>
                <span className="inline-block bg-white bg-opacity-20 rounded-full px-3 py-1 text-sm font-medium mt-2">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>
                  First Name
                </label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                  className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200`}
                />
              </div>

              {/* Last Name */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                  className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200`}
                />
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${textClass} mb-2`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-300 bg-gray-50 text-gray-500'} rounded-md transition-colors duration-200`}
                />
                <p className={`text-xs ${textSecondaryClass} mt-1`}>Email cannot be changed</p>
              </div>
            </div>

            {/* Preferences Section */}
            <div className={`mt-8 pt-6 border-t ${borderClass}`}>
              <h3 className={`text-lg font-medium ${textClass} mb-4`}>⚙️ Preferences</h3>
              
              <div className="space-y-4">
                {/* Theme Selection - WORKING VERSION! */}
                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-3`}>
                    Theme
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="light"
                        checked={profile.theme === 'light'}
                        onChange={(e) => handleThemeChange(e.target.value)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`ml-2 text-sm ${textClass}`}>☀️ Light</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="dark"
                        checked={profile.theme === 'dark'}
                        onChange={(e) => handleThemeChange(e.target.value)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`ml-2 text-sm ${textClass}`}>🌙 Dark</span>
                    </label>
                  </div>
                  
                  {/* Theme Status Indicator */}
                  <div className="mt-2 text-xs">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile.theme === 'dark' 
                        ? 'bg-gray-800 text-gray-200' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {profile.theme === 'dark' ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'}
                    </span>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.notifications}
                      onChange={(e) => setProfile({...profile, notifications: e.target.checked})}
                      className="text-indigo-600 focus:ring-indigo-500 rounded"
                    />
                    <span className={`ml-2 text-sm ${textClass}`}>
                      📧 Receive email notifications
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`mt-8 pt-6 border-t ${borderClass} flex justify-between`}>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className={`px-4 py-2 border ${isDark ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200`}
              >
                ← Back to Dashboard
              </button>
              
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
              >
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className={`mt-6 ${cardBgClass} rounded-lg shadow p-6 transition-all duration-300`}>
          <h3 className={`text-lg font-medium ${textClass} mb-3`}>📊 Account Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`text-center p-4 ${isDark ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg transition-colors duration-200`}>
              <div className="text-2xl font-bold text-blue-600">7</div>
              <div className={`text-sm ${textSecondaryClass}`}>Days Active</div>
            </div>
            <div className={`text-center p-4 ${isDark ? 'bg-green-900' : 'bg-green-50'} rounded-lg transition-colors duration-200`}>
              <div className="text-2xl font-bold text-green-600">24</div>
              <div className={`text-sm ${textSecondaryClass}`}>Sessions</div>
            </div>
            <div className={`text-center p-4 ${isDark ? 'bg-purple-900' : 'bg-purple-50'} rounded-lg transition-colors duration-200`}>
              <div className="text-2xl font-bold text-purple-600">Viewer</div>
              <div className={`text-sm ${textSecondaryClass}`}>Role Level</div>
            </div>
          </div>
        </div>

        {/* Theme Test Card - Shows current theme info */}
        <div className={`mt-6 ${cardBgClass} rounded-lg shadow p-6 transition-all duration-300`}>
          <h3 className={`text-lg font-medium ${textClass} mb-3`}>🎨 Theme Test</h3>
          <div className="space-y-2">
            <p className={`text-sm ${textSecondaryClass}`}>
              Current theme: <span className={`font-semibold ${textClass}`}>{profile.theme}</span>
            </p>
            <p className={`text-sm ${textSecondaryClass}`}>
              Background: <span className={`font-semibold ${textClass}`}>{isDark ? 'Dark' : 'Light'}</span>
            </p>
            <p className={`text-sm ${textSecondaryClass}`}>
              Theme persistence: <span className="text-green-600 font-semibold">✅ Enabled</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
