export function initializeStationPanel() {
    const stationPanel = document.getElementById('stationPanel');
    const stationNameElement = document.getElementById('stationName');
    const inboundRideCountElement = document.getElementById('inboundRideCount');
    const outboundRideCountElement = document.getElementById('outboundRideCount');
    const bikeFluxElement = document.getElementById('bikeFlux');
    const histogramCanvas = document.getElementById('hourlyChart');
  
    // Function to update the station panel with selected station data
    function updateStationPanel(stationData) {
      stationNameElement.textContent = stationData.name || 'None';
      inboundRideCountElement.textContent = stationData.inboundRides || '--';
      outboundRideCountElement.textContent = stationData.outboundRides || '--';
      bikeFluxElement.textContent = stationData.bikeFlux || '--';
  
      // Update the hourly histogram chart (you can replace this with your Chart.js setup)
      const ctx = histogramCanvas.getContext('2d');
      if (stationData.hourlyData) {
        const chartData = {
          labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
          datasets: [{
            label: 'Hourly Ride Traffic',
            data: stationData.hourlyData,
            backgroundColor: '#4caf50',
            borderColor: '#388e3c',
            borderWidth: 1,
            fill: true,
          }],
        };
  
        if (window.myChart) {
          window.myChart.data = chartData;
          window.myChart.update();
        } else {
          window.myChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            },
          });
        }
      }
    }
  
    // Function to show or hide the station panel
    function toggleStationPanel(visible) {
      stationPanel.style.display = visible ? 'block' : 'none';
    }
  
    // Listen for station selection (this assumes a global `selectedStationId` is set)
    document.addEventListener('stationSelected', (event) => {
      const stationData = event.detail;
      updateStationPanel(stationData);
      toggleStationPanel(true);
    });
}
  