import { getTheme } from "./optionsPanel.js";

let pieChart;

function initPieChart(containerId = 'rideTypeChart') {
  destroyPieChart(); // Clear existing chart (if any)

  const isDark = getTheme(); // 'light' or 'dark'

  pieChart = Highcharts.chart(containerId, {
    chart: {
      type: 'pie',
      height: 200,
      backgroundColor: 'transparent', // Transparent background
    },
    title: {
      text: 'Ride Types',
      style: { 
        fontSize: '14px',
        color: isDark ? '#ffffff' : '#000000'
      }
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>', // Show percentage in tooltip
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: false, // Disable data labels (handle legend separately)
        },
      },
    },
    series: [{
      name: 'Rides',
      colorByPoint: true,
      data: [
        { name: 'Inbound', y: 0 },
        { name: 'Outbound', y: 0 },
        { name: 'Looped', y: 0 }
      ]
    }],
    legend: {
      itemStyle: {
        color: isDark ? '#ffffff' : '#000000', // Adjust legend color for dark/light theme
      },
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      x: 0,
      y: 10,
    }
  });
}

export function updatePieChart(rideTypeTotals) {
  // Make sure pieChart exists and update the data
  if (!pieChart) {
    initPieChart(); // Initialize if not already created
  }

  // Calculate total and percentages for inbound, outbound, and looped
  const total = rideTypeTotals.inbound + rideTypeTotals.outbound + rideTypeTotals.looped;
  const inboundPercentage = (rideTypeTotals.inbound / total) * 100;
  const outboundPercentage = (rideTypeTotals.outbound / total) * 100;
  const loopedPercentage = (rideTypeTotals.looped / total) * 100;

  // Update the pie chart with percentage data
  pieChart.series[0].setData([
    { name: 'Inbound', y: inboundPercentage },
    { name: 'Outbound', y: outboundPercentage },
    { name: 'Looped', y: loopedPercentage }
  ]);
}

export function destroyPieChart() {
  if (pieChart) {
    pieChart.destroy(); // Destroy the existing chart
    pieChart = null;
  }
}
