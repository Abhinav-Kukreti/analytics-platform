import React from 'react';

const WebSocketStatus = ({ status, onReconnect }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'Connecting':
        return {
          color: 'yellow',
          text: 'Connecting...',
          icon: '🔄'
        };
      case 'Open':
        return {
          color: 'green',
          text: 'Connected',
          icon: '🟢'
        };
      case 'Closed':
        return {
          color: 'red',
          text: 'Disconnected',
          icon: '🔴'
        };
      case 'Reconnecting':
        return {
          color: 'yellow',
          text: 'Reconnecting...',
          icon: '🔄'
        };
      case 'Failed':
        return {
          color: 'red',
          text: 'Connection Failed',
          icon: '❌'
        };
      case 'Error':
        return {
          color: 'red',
          text: 'Connection Error',
          icon: '⚠️'
        };
      default:
        return {
          color: 'gray',
          text: 'Unknown',
          icon: '❓'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    gray: 'text-gray-600 bg-gray-100'
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusInfo.color]}`}>
        <span className="mr-1">{statusInfo.icon}</span>
        {statusInfo.text}
      </span>
      
      {(status === 'Closed' || status === 'Failed' || status === 'Error') && (
        <button
          onClick={onReconnect}
          className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default WebSocketStatus;
