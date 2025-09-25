import React from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ExportData = ({ data, chartRefs = [] }) => {
  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yOffset = 20;

      // Add title
      pdf.setFontSize(20);
      pdf.text('Analytics Report', 20, yOffset);
      yOffset += 20;

      // Add date
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yOffset);
      yOffset += 20;

      // Capture charts and add to PDF
      for (let i = 0; i < chartRefs.length; i++) {
        const chartElement = chartRefs[i].current;
        if (chartElement) {
          const canvas = await html2canvas(chartElement);
          const imgData = canvas.toDataURL('image/png');
          
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (yOffset + imgHeight > 280) {
            pdf.addPage();
            yOffset = 20;
          }
          
          pdf.addImage(imgData, 'PNG', 20, yOffset, imgWidth, imgHeight);
          yOffset += imgHeight + 20;
        }
      }

      pdf.save('analytics-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const exportToCSV = () => {
    if (!data || !data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-data-${new Date().getTime()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={exportToPDF}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        📄 Export PDF
      </button>
      <button
        onClick={exportToCSV}
        disabled={!data?.length}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        📊 Export CSV
      </button>
    </div>
  );
};

export default ExportData;
