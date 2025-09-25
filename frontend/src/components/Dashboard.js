import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import MetricsCard from './MetricsCard';
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import { Doughnut } from 'react-chartjs-2';
import AdvancedFilters from './AdvancedFilters';
import WebSocketStatus from './WebSocketStatus';
import PDFExport from './PDFExport';
import CSVExport from './CSVExport';
import { useAuth } from '../contexts/AuthContext';

// Register Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const Dashboard = () => {
  const { user, logout } = useAuth();

  // 🔥 Helper function for permission checking with fallback
  const hasPermission = (permission) => {
    try {
      if (!user?.permissions) return false;
      return user.permissions.includes(permission);
    } catch (error) {
      console.warn('Permission check failed:', error);
      return false;
    }
  };

  // 🔥 Helper function for role display
  const getRoleInfo = (role) => {
    const roles = {
      'ADMIN': { name: 'Administrator', color: 'bg-red-100 text-red-800' },
      'ANALYST': { name: 'Analyst', color: 'bg-blue-100 text-blue-800' },
      'VIEWER': { name: 'Viewer', color: 'bg-green-100 text-green-800' }
    };
    return roles[role] || roles['VIEWER'];
  };

  // 1️⃣ ALL STATE DECLARATIONS
  const [filteredData, setFilteredData] = useState([]);
  const [realTimeEvents, setRealTimeEvents] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    },
    eventTypes: [],
    searchQuery: '',
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);

  // 🔥 WebSocket state management
  const [connectionStatus, setConnectionStatus] = useState('Closed');
  const [lastMessage, setLastMessage] = useState(null);

  // 2️⃣ REFS
  const lineChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const barChartRef = useRef(null);
  
  // 🔥 WebSocket refs
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // 3️⃣ WEBSOCKET CONFIGURATION
  const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'wss://q6s7133e0e.execute-api.us-east-1.amazonaws.com/dev';

  // 🔥 WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!isRealTimeEnabled || !WEBSOCKET_URL) {
      return;
    }

    console.log('🔌 Attempting WebSocket connection to:', WEBSOCKET_URL);
    setConnectionStatus('Connecting');

    try {
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      websocketRef.current = new WebSocket(WEBSOCKET_URL);

      websocketRef.current.onopen = (event) => {
        console.log('✅ WebSocket CONNECTED successfully!', event);
        setConnectionStatus('Open');
        reconnectAttemptsRef.current = 0;

        if (user?.tenantId) {
          setTimeout(() => {
            if (websocketRef.current?.readyState === WebSocket.OPEN) {
              console.log('📤 Joining tenant room:', user.tenantId);
              websocketRef.current.send(JSON.stringify({
                action: 'join-tenant',
                tenantId: user.tenantId
              }));
            }
          }, 500);
        }
      };

      websocketRef.current.onmessage = (event) => {
        console.log('📨 WebSocket message received:', event.data);
        
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);

          if (message.type === 'new-event') {
            setRealTimeEvents(prev => [message.data, ...prev.slice(0, 9)]);
            fetchAnalytics();
          } else if (message.type === 'joined') {
            console.log('✅ Successfully joined tenant room:', message.tenantId);
          }
        } catch (e) {
          console.log('📨 Raw WebSocket message:', event.data);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('❌ WebSocket ERROR:', error);
        setConnectionStatus('Error');
      };

      websocketRef.current.onclose = (event) => {
        console.log('🔴 WebSocket CLOSED:', event.code, event.reason, 'Clean:', event.wasClean);
        setConnectionStatus('Closed');

        if (isRealTimeEnabled && 
            event.code !== 1000 && 
            reconnectAttemptsRef.current < maxReconnectAttempts) {
          
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in 5 seconds`);
          
          setConnectionStatus('Reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached');
          setConnectionStatus('Failed');
        }
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('Error');
    }
  }, [isRealTimeEnabled, WEBSOCKET_URL, user?.tenantId]);

  // 🔥 Disconnect WebSocket function
  const disconnectWebSocket = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Client disconnect');
    }
    
    setConnectionStatus('Closed');
    reconnectAttemptsRef.current = 0;
  }, []);

  // 🔥 Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested');
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  // 4️⃣ DATA FUNCTIONS
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const result = generateDemoData();
      setAnalyticsData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo data generator
  const generateDemoData = () => {
    const eventTypes = ['pageview', 'click', 'signup', 'purchase', 'download', 'share'];
    const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const data = [];

    // Generate last 7 days of data
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const eventsPerDay = Math.floor(Math.random() * 40) + 10;
      
      for (let j = 0; j < eventsPerDay; j++) {
        const eventTime = new Date(date);
        eventTime.setHours(Math.floor(Math.random() * 24));
        eventTime.setMinutes(Math.floor(Math.random() * 60));
        
        data.push({
          id: `event_${Date.now()}_${Math.random()}`,
          eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          userId: users[Math.floor(Math.random() * users.length)],
          timestamp: eventTime.toISOString(),
          eventData: {
            page: `/page${Math.floor(Math.random() * 10)}`,
            value: Math.floor(Math.random() * 100),
          }
        });
      }
    }

    // Add real-time events to the dataset
    realTimeEvents.forEach(event => {
      data.push(event);
    });

    return {
      data: data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      eventTypes: eventTypes,
      status: 'success'
    };
  };

  // Toggle real-time updates
  const toggleRealTime = () => {
    console.log('🔄 Toggling real-time updates:', !isRealTimeEnabled);
    setIsRealTimeEnabled(prev => !prev);
  };

  // 🔥 Clean logout function
  const handleLogout = () => {
    try {
      // Disconnect WebSocket
      disconnectWebSocket();
      // Call auth context logout
      logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout by clearing localStorage and redirecting
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
  };

  // 5️⃣ MEMOIZED VALUES
  const processedData = useMemo(() => {
    if (!analyticsData?.data) return null;

    let data = analyticsData.data;

    // Apply date range filter
    data = data.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= filters.dateRange.startDate && 
             eventDate <= filters.dateRange.endDate;
    });

    // Apply event type filter
    if (filters.eventTypes.length > 0) {
      const selectedTypes = filters.eventTypes.map(t => t.value);
      data = data.filter(event => selectedTypes.includes(event.eventType));
    }

    // Apply search filter
    if (filters.searchQuery) {
      data = data.filter(event => 
        JSON.stringify(event).toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }

    return data;
  }, [analyticsData, filters, realTimeEvents]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (!processedData) return null;

    const timeSeriesData = {};
    processedData.forEach(event => {
      const hour = format(new Date(event.timestamp), 'yyyy-MM-dd HH:00');
      timeSeriesData[hour] = (timeSeriesData[hour] || 0) + 1;
    });

    const timeLabels = Object.keys(timeSeriesData).sort();
    const timeValues = timeLabels.map(label => timeSeriesData[label]);

    const eventTypeData = {};
    processedData.forEach(event => {
      eventTypeData[event.eventType] = (eventTypeData[event.eventType] || 0) + 1;
    });

    const topEvents = Object.entries(eventTypeData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      lineChart: {
        labels: timeLabels,
        datasets: [{
          label: 'Events per Hour',
          data: timeValues,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
        }],
      },
      doughnutChart: {
        labels: Object.keys(eventTypeData),
        datasets: [{
          data: Object.values(eventTypeData),
          backgroundColor: [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
          ],
        }],
      },
      barChart: {
        labels: topEvents.map(([name]) => name),
        datasets: [{
          label: 'Event Count',
          data: topEvents.map(([, count]) => count),
          backgroundColor: '#4f46e5',
          borderColor: '#3730a3',
          borderWidth: 1,
        }],
      },
    };
  }, [processedData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!processedData) return null;

    const total = processedData.length;
    const uniqueUsers = new Set(processedData.map(e => e.userId)).size;
    const uniqueEventTypes = new Set(processedData.map(e => e.eventType)).size;
    const avgPerHour = total / (24 * 7);

    return {
      totalEvents: total,
      uniqueUsers,
      uniqueEventTypes,
      avgPerHour: Math.round(avgPerHour * 10) / 10,
    };
  }, [processedData]);

  // 6️⃣ EFFECTS
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // WebSocket connection effect
  useEffect(() => {
    if (isRealTimeEnabled) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isRealTimeEnabled, connectWebSocket, disconnectWebSocket]);

  // 7️⃣ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // 8️⃣ MAIN JSX RETURN
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Proper Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Analytics Platform
                  </h1>
                  <p className="text-xs text-gray-500">
                    {user?.companyName || 'Enterprise Dashboard'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 🔥 IMPROVED Navigation Menu with React Router */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/dashboard"
                className="text-indigo-600 bg-indigo-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                📊 Dashboard
              </Link>
              
              {hasPermission('manage:users') && (
                <Link
                  to="/team"
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  👥 Team
                </Link>
              )}
              
              {hasPermission('view:audit_logs') && (
                <Link
                  to="/audit"
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  🔍 Audit
                </Link>
              )}
              
              <Link
                to="/profile"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                👤 Profile
              </Link>
            </div>

            {/* User Info and Controls */}
            <div className="flex items-center space-x-4">
              {/* WebSocket Status */}
              <WebSocketStatus 
                status={connectionStatus}
                onReconnect={reconnect}
              />
              
              {/* Real-time Toggle */}
              <div className="flex items-center space-x-2">
                <span className="hidden sm:block text-sm font-medium text-gray-700">Real-time</span>
                <button
                  type="button"
                  onClick={toggleRealTime}
                  className={`${
                    isRealTimeEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      isRealTimeEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
                {isRealTimeEnabled && connectionStatus === 'Open' && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="hidden sm:block text-xs text-green-600 font-medium">LIVE</span>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleInfo(user?.role).color}`}>
                    {getRoleInfo(user?.role).name}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <AdvancedFilters 
            onFiltersChange={setFilters}
            eventTypes={analyticsData?.eventTypes || []}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Error: {error}
              </div>
            </div>
          )}

          {/* Export Section - Only show if user has export permissions */}
          {hasPermission('export:data') && (
            <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Export Data
                    </h3>
                    <p className="text-sm text-gray-500">
                      Download your analytics data in PDF or CSV format
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <PDFExport 
                      analyticsData={analyticsData} 
                      kpis={kpis} 
                      filters={filters} 
                    />
                    <CSVExport 
                      analyticsData={analyticsData} 
                      kpis={kpis} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Events Feed */}
          {realTimeEvents.length > 0 && (
            <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Live Events
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {realTimeEvents.length} recent
                  </span>
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {realTimeEvents.map((event, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{event.eventType}</span>
                        <span className="text-xs text-gray-500">by {event.userId}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Content */}
          {kpis && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricsCard
                  title="Total Events"
                  value={kpis.totalEvents.toLocaleString()}
                  change={12}
                  changeType="increase"
                  icon="📊"
                  color="indigo"
                />
                <MetricsCard
                  title="Unique Users"
                  value={kpis.uniqueUsers.toLocaleString()}
                  change={8}
                  changeType="increase"
                  icon="👥"
                  color="green"
                />
                <MetricsCard
                  title="Event Types"
                  value={kpis.uniqueEventTypes}
                  change={0}
                  changeType="neutral"
                  icon="🔥"
                  color="yellow"
                />
                <MetricsCard
                  title="Avg/Hour"
                  value={kpis.avgPerHour}
                  change={15}
                  changeType="increase"
                  icon="⚡"
                  color="purple"
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Line Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <LineChart 
                      key="line-chart-unique"
                      data={chartData.lineChart}
                      title="Events Timeline"
                      height={300}
                    />
                  </div>
                </div>

                {/* Doughnut Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Event Distribution
                    </h3>
                    <div className="h-64 flex items-center justify-center">
                      <Doughnut 
                        key="doughnut-chart-unique"
                        ref={doughnutChartRef}
                        data={chartData.doughnutChart}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <BarChart 
                    key="bar-chart-unique"
                    data={chartData.barChart}
                    title="Top Events"
                    height={300}
                  />
                </div>
              </div>
            </>
          )}

          {!processedData?.length && !loading && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Data Available
                </h3>
                <p className="text-gray-500 mb-4">
                  No events found for the selected filters. Try adjusting your date range or event types.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
