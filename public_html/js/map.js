let map;
let lightTileLayer;
let darkTileLayer;

export const stationCoords = new Map();

/*
export function loadStations(map, callback) {
  fetch('data/station_list.json')
    .then(response => response.json())
    .then(stations => {
      const stationMarkers = stations.map(station => {
        
        const marker = L.circleMarker([station.station_lat, station.station_lng], {
          radius: 8,
          color: 'blue', // Default color for markers
          fillOpacity: 1,
        }).addTo(map);

        // Store station data inside the marker object
        marker.options.station = station;

        return marker;
      });

      // Execute the callback with the created markers
      callback(stationMarkers);
    })
    .catch(error => console.error('Error loading station data:', error));
}
*/

export function initializeMap() {
  // Create the map
  map = L.map('map').setView([40.73, -73.95], 13);
  window.map = map;

  // Set up the light theme tile layer
  lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  // Set up the dark theme tile layer
  darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  // Add the light tile layer by default
  lightTileLayer.addTo(map);

  // Return the map object for use elsewhere
  return map;
}

// Function to toggle between light and dark map themes
export function toggleDarkTheme(isDark) {
  if (isDark) {
    // Switch to dark theme
    map.removeLayer(lightTileLayer);
    darkTileLayer.addTo(map);
  } else {
    // Switch to light theme
    map.removeLayer(darkTileLayer);
    lightTileLayer.addTo(map);
  }
}
