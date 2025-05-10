  import { getDefaultStationStyle, getSelectedStationStyle, getStationStyle, getInterpolatedAlpha } from './styles.js';
  import { getTheme , getSelectedMonth} from './optionsPanel.js';
  import { updateHistogram, destroyHistogram } from './histogram.js'; // Make sure you have this helper module
  import { drawRideLines, destroyRideLines } from './rideLines.js';
  import { debounce } from './utils.js';
  import { updatePieChart, destroyPieChart } from './pieChart.js';

  let stationMarkers = new Map(); // station_id => marker
  let selectedStationId = null;
  export const stationCoords = new Map();

  const debouncedUpdateMarkerStyles = debounce(updateAllMarkerStyles, 100);

  export async function initializeStationManager(map) {
    let justClickedMarker = false;

    const response = await fetch('data/station_list.json');
    const stations = await response.json();

    stations.forEach(station => {
      const lat = parseFloat(station.station_lat);
      const lng = parseFloat(station.station_lng);
      const stationId = station.station_id;
      const appeared_month = station.appeared_month;

      const marker = L.circleMarker([lat, lng], getStationStyle(false, getTheme(), map.getZoom()))
      .on('click', () => {
        justClickedMarker = true;
        selectStation(stationId, map.getZoom());
      });

    stationMarkers.set(stationId, marker);
      const { station_id, station_lat, station_lng } = station;
      stationCoords.set(station_id, {
        coords: [parseFloat(station_lat), parseFloat(station_lng)],
        appeared_month
      });
      marker.bindTooltip(station.station_name, { permanent: false });
      stationMarkers.set(stationId, marker);
    });

    updateVisibleStations(getSelectedMonth(), map.getZoom());

    map.on('click', () => {
      if (justClickedMarker) {
        justClickedMarker = false;
        return;
      }
      clearSelectedStation(map.getZoom());
    });

    map.on('zoomend', () => {
      debouncedUpdateMarkerStyles(map.getZoom());
    });

    const selectedIdInput = document.getElementById('selectedStationId');
    const observer = new MutationObserver(() => {
      updateStationInfo(selectedIdInput.value);
    });
    observer.observe(selectedIdInput, { attributes: true, attributeFilter: ['value'] });

    updateStationInfo(null);
  }

  export function updateVisibleStations(selectedMonth, zoom) {
    const theme = getTheme();
    let numHidden = 0;
    stationCoords.forEach(({ coords, appeared_month }, stationId) => {
      const marker = stationMarkers.get(stationId);
      if (!marker) return;

      if (parseInt(selectedMonth) < parseInt(appeared_month) && stationId === selectedStationId) {
        clearSelectedStation(zoom); // Deselect the station if it's going to be hidden
      }
  
      if (parseInt(selectedMonth) >= parseInt(appeared_month)) {
        if (!marker._map) marker.addTo(window.map); // Add if not already on map
        marker.setStyle(getStationStyle(stationId === selectedStationId, theme, zoom));
      } else {
        numHidden += 1;
        if (marker._map) marker.remove(); // Hide if it appeared later
      }
    });

    console.log("Hiding ", numHidden, " stations for the selected month.");
  }
  

  export function selectStation(stationId, zoom) {
    if (selectedStationId && stationMarkers.has(selectedStationId)) {
      const oldMarker = stationMarkers.get(selectedStationId);
      oldMarker.setStyle(getStationStyle(false, getTheme(), zoom));
    }

    const newMarker = stationMarkers.get(stationId);
    if (newMarker) {
      newMarker.setStyle(getStationStyle(true, getTheme(), zoom));
      selectedStationId = stationId;
      document.getElementById('selectedStationId').value = stationId;
      document.getElementById('stationName').textContent = newMarker.getTooltip().getContent();
    }

    loadStationRideData(stationId, getSelectedMonth());
  }

  export function clearSelectedStation(zoom) {
    if (selectedStationId && stationMarkers.has(selectedStationId)) {
      const marker = stationMarkers.get(selectedStationId);
      marker.setStyle(getStationStyle(false, getTheme(), zoom));
    }

    selectedStationId = null;
    document.getElementById('selectedStationId').value = '';
    document.getElementById('stationName').textContent = 'Select a Station For Info';
    updatePanelCounts({
      inbound: 0,
      outbound: 0,
      flux: 0
    });
    document.getElementById('bikeFluxCount').style.color = '';

    // Clear the histogram chart
    //const canvas = document.getElementById('histogramChart');
    //const container = document.getElementById('histogramChartContainer');
    // Reset the canvas dimensions (optional, to clear any drawing or resizing)
    //canvas.width = container.offsetWidth;
    //canvas.height = Math.max(container.offsetHeight, 200); // Ensure a minimum height of 200px
    destroyHistogram();
    destroyRideLines();
    destroyPieChart();
  }


  export function updateAllMarkerStyles(zoom) {
    const theme = getTheme();
    const markerStyle = getStationStyle(false, theme, zoom);

    stationMarkers.forEach((marker, stationId) => {
      const isSelected = stationId === selectedStationId;

      if( isSelected ) { marker.setStyle(getStationStyle(true, theme, zoom));} else { marker.setStyle(markerStyle); }
    });
  }

  function updateStationInfo(stationId) {
    const nameDiv = document.getElementById('stationName');
    if (!stationId || !stationMarkers.has(stationId)) {
      nameDiv.textContent = 'Select a Station For Info';
    } else {
      const marker = stationMarkers.get(stationId);
      if (marker && marker.getTooltip()) {
        nameDiv.textContent = marker.getTooltip().getContent();
      }
    }
  }

  export function loadStationRideData(stationId, month) {
    console.log("Load data for station ", stationId, " and month ", month);
    const twoDigitMonth = String(month).padStart(2, '0');
    const dir = stationId.slice(0, 2);
    const url = `data/stations/${dir}/${stationId}/2024-${twoDigitMonth}-ridedata.json`;

    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load data: ${response.status}`);
        return response.json();
      })
      .then(data => {
        // Process hourly counts
        const { hourlyCounts, rideTypeTotals } = processHourlyRideData(data.rides);
        
        updatePanelCounts({
          inbound: data.summary.total_inbound,
          outbound: data.summary.total_outbound,
          flux: data.summary.flux
        });

        //const bikeFluxElement = document.getElementById('bikeFluxCount');
        if (data.summary.flux < 0) {
          document.getElementById('bikeFluxCount').style.color = 'red';
        } else {
          document.getElementById('bikeFluxCount').style.color = 'green';
        }

        // Now you can update the histogram with hourlyCounts
        drawRideLines(data);
        updateHistogram(hourlyCounts, getTheme());
        updatePieChart(rideTypeTotals);
      })
      .catch(error => {
        console.error('Error loading station ride data:', error);
      });
  }

  export function processHourlyRideData(rides) {
    const hourlyCounts = [Array(24).fill(0), Array(24).fill(0)];  // [inbound, outbound]
    const rideTypeTotals = { inbound: 0, outbound: 0, looped: 0 };

    rides.forEach(ride => {
      const hour = new Date(ride.started_at).getHours();

      if (ride.direction === '1') {
        hourlyCounts[0][hour]++;
        rideTypeTotals.inbound++;
      } else if (ride.direction === '0') {
        hourlyCounts[1][hour]++;
        rideTypeTotals.outbound++;
      } else if (ride.direction === '2') {
        // Count for both histogram and pie chart
        hourlyCounts[0][hour]++;
        hourlyCounts[1][hour]++;
        rideTypeTotals.inbound++;
        rideTypeTotals.outbound++;
        rideTypeTotals.looped++;
      }
    });

    return { hourlyCounts, rideTypeTotals };
  }

  export function handleMonthChange() {
    const month = getSelectedMonth();
    if (selectedStationId) {
      loadStationRideData(selectedStationId, month);
    }
    updateVisibleStations(month, window.map.getZoom());
  }
  

  export function updateStationPanel(data, stationId) {
    console.log("updateStationPanel() called for station ", stationId, "with data:");
    console.log(data);

    updatePanelCounts({
      inbound: data.summary.total_inbound,
      outbound: data.summary.total_outbound,
      flux: data.summary.flux
    });

    const { hourlyCounts } = processHourlyRideData(data.rides);
    updateHistogram(hourlyCounts, getTheme());
  }

  function updatePanelCounts({ inbound, outbound, flux }) {
    document.getElementById('inboundCount').innerHTML = inbound;
    document.getElementById('outboundCount').innerHTML = outbound;
    document.getElementById('bikeFluxCount').innerHTML = flux;
    document.getElementById('bikeFluxCount').style.color = flux < 0 ? 'red' : 'green';
  }