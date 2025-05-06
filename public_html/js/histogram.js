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
