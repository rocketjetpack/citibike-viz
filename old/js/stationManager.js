import { getDefaultStationStyle, getSelectedStationStyle, getStationStyle, getInterpolatedAlpha } from './styles.js';
import { getTheme } from './optionsPanel.js';
import { updateHistogram, destroyHistogram } from './histogram.js'; // Make sure you have this helper module
import { drawRideLines, destroyRideLines } from './rideLines.js';
import { debounce, getCurrentMonth } from './utils.js';

let stationMarkers = new Map(); // station_id => marker
let selectedStationId = null;
export const stationCoords = new Map();

const debouncedUpdateMarkerStyles = debounce(updateAllMarkerStyles, 100);

// Called from init.js
export async function initializeStationManager(map) {
  let justClickedMarker = false;

  const response = await fetch('data/station_list.json');
  const stations = await response.json();

  stations.forEach(station => {
    const lat = parseFloat(station.station_lat);
    const lng = parseFloat(station.station_lng);
    const stationId = station.station_id;

    const marker = L.circleMarker([lat, lng], getStationStyle(false, getTheme(), map.getZoom()))
      .addTo(map)
      .on('click', () => {
        justClickedMarker = true;
        selectStation(stationId, map.getZoom());
      });
    const { station_id, station_lat, station_lng } = station;
    stationCoords.set(station_id, [parseFloat(station_lat), parseFloat(station_lng)]);
    marker.bindTooltip(station.station_name, { permanent: false });
    stationMarkers.set(stationId, marker);
  });

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

  loadStationRideData(stationId, document.getElementById('monthSlider').value);
}

export function clearSelectedStation(zoom) {
  if (selectedStationId && stationMarkers.has(selectedStationId)) {
    const marker = stationMarkers.get(selectedStationId);
    marker.setStyle(getStationStyle(false, getTheme(), zoom));
  }

  selectedStationId = null;
  document.getElementById('selectedStationId').value = '';
  document.getElementById('stationName').textContent = 'Select a Station For Info';
  document.getElementById('inboundCount').innerHTML = '0';
  document.getElementById('outboundCount').innerHTML = '0';
  document.getElementById('bikeFluxCount').innerHTML = '0';

  // Clear the histogram chart
  //const canvas = document.getElementById('histogramChart');
  //const container = document.getElementById('histogramChartContainer');
  // Reset the canvas dimensions (optional, to clear any drawing or resizing)
  //canvas.width = container.offsetWidth;
  //canvas.height = Math.max(container.offsetHeight, 200); // Ensure a minimum height of 200px
  destroyHistogram();
  destroyRideLines();
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
      const hourlyCounts = processHourlyRideData(data.rides);
      
      console.log(data.summary);
      document.getElementById('inboundCount').innerHTML = data.summary.total_inbound;
      document.getElementById('outboundCount').innerHTML = data.summary.total_outbound;
      document.getElementById('bikeFluxCount').innerHTML = data.summary.flux;

      //const bikeFluxElement = document.getElementById('bikeFluxCount');
      if (data.summary.flux < 0) {
        document.getElementById('bikeFluxCount').style.color = 'red';
      } else {
        document.getElementById('bikeFluxCount').style.color = 'green';
      }

      // Now you can update the histogram with hourlyCounts
      drawRideLines(data);
      updateHistogram(hourlyCounts, getTheme());
    })
    .catch(error => {
      console.error('Error loading station ride data:', error);
    });
}

// Assuming this function is being called in the right context (after selecting a station and month)
export function processHourlyRideData(rides) {
  const hourlyCounts = [Array(24).fill(0), Array(24).fill(0)];  // Initialize 2D array: index 0 for inbound, index 1 for outbound
  
  // Iterate over the rides to populate the hourly counts
  rides.forEach(ride => {
    const hour = new Date(ride.started_at).getHours();  // Get the hour from the ride's start time
    
    if (ride.direction === '1') {  // Inbound ride
      hourlyCounts[0][hour] += 1;
    } else if (ride.direction === '0') {  // Outbound ride
      hourlyCounts[1][hour] += 1;
    } else if (ride.direction === '2') { //Looped rides
      hourlyCounts[0][hour] += 1;
      hourlyCounts[1][hour] += 1;
    }
  });
  
  return hourlyCounts;  // This will be an array with two elements (inbound, outbound)
}

export function handleMonthChange() {
  const month = getCurrentMonth();
  const stationId = selectedStationId;

  if (!stationId) return; // No station selected, nothing to update

  const jsonPath = `data/stations/${stationId.slice(0, 2)}/${stationId}/2024-${month}-ridedata.json`;

  fetch(jsonPath)
    .then(res => {
      if (!res.ok) throw new Error(`Missing data for ${stationId} in ${month}`);
      return res.json();
    })
    .then(data => {
      updateStationPanel(data, stationId);
      drawRideLines(data);
    })
    .catch(err => {
      console.error(err);
      // Clear data if load fails
      updateStationPanel(null, stationId);
      destroyRideLines();
    });
}

export function updateStationPanel(data, stationId) {
  console.log("updateStationPanel() called for station ", stationId, "with data:");
  console.log(data);

  const inboundCount = data.summary.total_inbound;
  const outboundCount = data.summary.total_outbound;
  const fluxCount = data.summary.flux;

  document.getElementById('inboundCount').innerHTML = inboundCount;
  document.getElementById('outboundCount').innerHTML = outboundCount;
  document.getElementById('bikeFluxCount').innerHTML = fluxCount;

  const hourlyCounts = processHourlyRideData(data.rides);
  updateHistogram(hourlyCounts, getTheme());
}
