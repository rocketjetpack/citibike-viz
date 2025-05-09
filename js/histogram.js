let currentChart = null;

export function destroyHistogram() {
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
}

export function updateHistogram(hourlyCounts, themeIsDark = false) {
  const container = document.getElementById('histogramChartContainer');

  if (!container) {
    console.error('Error: histogram chart container not found.');
    return;
  }

  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const inboundCounts = hourlyCounts[0];
  const outboundCounts = hourlyCounts[1];

  destroyHistogram(); // Clean up any existing chart

  currentChart = Highcharts.chart(container, {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: container.offsetHeight || 250,
    },
    plotOptions: {
      series: {
        stacking: 'normal'
      }
    },
    title: {
      text: 'Hourly Rides',
      style: { 
        fontSize: '14px',
        color: themeIsDark ? '#ffffff' : '#000000'
      }
    },
    xAxis: {
      categories: hours,
      title: {
        text: 'Hour of the Day',
        style: {
          color: themeIsDark ? '#ffffff' : '#000000'
        }
      },
      labels: {
        style: {
          color: themeIsDark ? '#ffffff' : '#000000'
        }
      }
    },
    yAxis: {
      title: {
        text: null
      },
      labels: {
        style: {
          color: themeIsDark ? '#ffffff' : '#000000'
        }
      }
    },
    tooltip: {
      shared: true
    },
    plotOptions: {
      column: {
        stacking: 'normal'
      }
    },
    legend: {
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: {
        color: themeIsDark ? '#ffffff' : '#000000'
      }
    },
    series: [
      {
        name: 'Inbound Rides',
        data: inboundCounts,
        color: 'rgba(0, 128, 0, 0.8)'
      },
      {
        name: 'Outbound Rides',
        data: outboundCounts.map(count => -count), // Negative for "below zero"
        color: 'rgba(255, 0, 0, 0.8)'
      }
    ],
    credits: { enabled: false }
  });
}


/*
FORMER CHARTS.JS CODE
let currentChart = null; // Store the current chart instance

export function destroyHistogram() {
  if (currentChart) {
    currentChart.destroy();
  }
}

export function updateHistogram(hourlyCounts) {
  const canvas = document.getElementById('histogramChart');
  const container = document.getElementById('histogramChartContainer');

  // Ensure the container exists before proceeding
  if (!container) {
    console.error('Error: histogram chart container not found.');
    return;
  }

  // Reset the canvas dimensions (to avoid stretching)
  canvas.width = container.offsetWidth;
  canvas.height = Math.max(container.offsetHeight, 200); // Ensure a minimum height of 200px

  // Destroy the previous chart if it exists
  if (currentChart) {
    currentChart.destroy();
  }

  const ctx = canvas.getContext('2d');

  const hours = Array.from({ length: 24 }, (_, i) => i);  // 0 to 23 hours

  const inboundCounts = hourlyCounts[0];  // Inbound hourly counts
  const outboundCounts = hourlyCounts[1]; // Outbound hourly counts

  // Create the histogram
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hours, // X-axis labels (0-23 for hours)
      datasets: [
        {
          label: 'Inbound Rides',
          data: inboundCounts,
          backgroundColor: 'green',
          borderColor: 'darkgreen',
          borderWidth: 1,
          stack: 'stack1', // Stack the inbound and outbound bars
        },
        {
          label: 'Outbound Rides',
          data: outboundCounts.map(count => -count), // Negative for outbound rides to show below 0
          backgroundColor: 'red',
          borderColor: 'darkred',
          borderWidth: 1,
          stack: 'stack1', // Stack the inbound and outbound bars
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allow custom height settings
      aspectRatio: 2, // Keep a good ratio of width to height (this is optional)
      plugins: {
        legend: {
          position: 'bottom', // Move the legend below the chart
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Hour of the Day',
          }
        },
        y: {
          title: {
            display: true,
            text: 'Number of Rides',
          },
          beginAtZero: true,
          stacked: true, // Stack the bars
        }
      }
    }
  });
}
*/
