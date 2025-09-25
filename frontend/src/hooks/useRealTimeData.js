import { useState, useEffect, useRef } from 'react';

// Demo data generator
const generateDemoData = () => {
  const eventTypes = ['pageview', 'click', 'signup', 'purchase', 'download', 'share'];
  const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
  const data = [];

  // Generate last 7 days of data
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Generate 10-50 events per day
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

  return {
    data: data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    eventTypes: eventTypes,
    status: 'success'
  };
};

export const useRealTimeData = (endpoint, interval = 5000) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRealTime, setIsRealTime] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      // For demo purposes, we'll use generated data instead of API
      // In a real app, you'd uncomment the fetch code below
      
      /* 
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      */
      
      // Demo data - remove this and uncomment above for real API
      const result = generateDemoData();
      
      // Add some new random events if real-time is enabled
      if (isRealTime && data) {
        const newEvents = [];
        const eventTypes = ['pageview', 'click', 'signup', 'purchase'];
        const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
        
        // Add 1-3 new events
        const newEventCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < newEventCount; i++) {
          newEvents.push({
            id: `event_${Date.now()}_${Math.random()}`,
            eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            userId: users[Math.floor(Math.random() * users.length)],
            timestamp: new Date().toISOString(),
            eventData: {
              page: `/page${Math.floor(Math.random() * 10)}`,
              value: Math.floor(Math.random() * 100),
            }
          });
        }
        
        result.data = [...result.data, ...newEvents];
      }
      
      setData(result);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const startRealTime = () => {
    if (intervalRef.current) return;
    
    setIsRealTime(true);
    intervalRef.current = setInterval(fetchData, interval);
  };

  const stopRealTime = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRealTime(false);
  };

  const toggleRealTime = () => {
    if (isRealTime) {
      stopRealTime();
    } else {
      startRealTime();
    }
  };

  useEffect(() => {
    fetchData(); // Initial fetch
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [endpoint]);

  return {
    data,
    isLoading,
    error,
    isRealTime,
    startRealTime,
    stopRealTime,
    toggleRealTime,
    refetch: fetchData,
  };
};
