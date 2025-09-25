import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import "react-datepicker/dist/react-datepicker.css";

const AdvancedFilters = ({ onFiltersChange, eventTypes = [] }) => {
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate: new Date(),
    },
    eventTypes: [],
    searchQuery: '',
  });

  const handleFilterChange = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const eventTypeOptions = eventTypes.map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
  }));

  const quickDateRanges = [
    { label: 'Last 24 Hours', value: 1 },
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
  ];

  const setQuickDateRange = (days) => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    handleFilterChange({
      dateRange: { startDate, endDate }
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={() => handleFilterChange({
            dateRange: {
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              endDate: new Date(),
            },
            eventTypes: [],
            searchQuery: '',
          })}
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range Picker */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <DatePicker
            selected={filters.dateRange.startDate}
            onChange={(date) => handleFilterChange({
              dateRange: { ...filters.dateRange, startDate: date }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            dateFormat="MMM dd, yyyy"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <DatePicker
            selected={filters.dateRange.endDate}
            onChange={(date) => handleFilterChange({
              dateRange: { ...filters.dateRange, endDate: date }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            dateFormat="MMM dd, yyyy"
          />
        </div>

        {/* Event Types Multi-Select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Event Types
          </label>
          <Select
            isMulti
            options={eventTypeOptions}
            value={filters.eventTypes}
            onChange={(selected) => handleFilterChange({ eventTypes: selected || [] })}
            className="w-full"
            placeholder="Select event types..."
          />
        </div>

        {/* Search Query */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
            placeholder="Search events..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Quick Date Range Buttons */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Date Ranges
        </label>
        <div className="flex flex-wrap gap-2">
          {quickDateRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setQuickDateRange(range.value)}
              className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;
