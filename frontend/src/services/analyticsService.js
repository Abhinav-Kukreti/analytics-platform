import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

class AnalyticsService {
  async getAnalytics(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/data`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch analytics';
    }
  }

  async ingestEvent(eventData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/events`, eventData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to ingest event';
    }
  }

  // Process raw data for charts
  processDataForCharts(rawData) {
    if (!rawData || !Array.isArray(rawData)) {
      return null;
    }

    // Group by event type
    const eventTypes = {};
    rawData.forEach((event) => {
      if (!eventTypes[event.eventType]) {
        eventTypes[event.eventType] = 0;
      }
      eventTypes[event.eventType]++;
    });

    // Time series data (group by hour)
    const timeSeriesData = {};
    rawData.forEach((event) => {
      const hour = new Date(event.timestamp).toISOString().slice(0, 13) + ':00:00';
      if (!timeSeriesData[hour]) {
        timeSeriesData[hour] = 0;
      }
      timeSeriesData[hour]++;
    });

    // Convert to chart format
    const pieChartData = {
      labels: Object.keys(eventTypes),
      datasets: [
        {
          data: Object.values(eventTypes),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
          ],
        },
      ],
    };

    const lineChartData = {
      labels: Object.keys(timeSeriesData).sort(),
      datasets: [
        {
          label: 'Events per Hour',
          data: Object.keys(timeSeriesData)
            .sort()
            .map((time) => timeSeriesData[time]),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
        },
      ],
    };

    return {
      pieChartData,
      lineChartData,
    };
  }
}

export default new AnalyticsService();
