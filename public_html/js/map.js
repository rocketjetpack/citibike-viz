let stationLayer = L.layerGroup();
let stationMarkers = [];
let lightLayer, darkLayer = null;

export async function createMap() {
    // NYC coordinates
    const center = [40.73, -73.95];
    const zoom = 13;

    const isDark = document.getElementById('chkDarkTheme').checked;

    // Light and dark tile layers
    lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB'
    });

    // Initialize map
    map = L.map('map', {
        center: [40.73, -73.95],
        zoom: 13,
        layers: [isDark ? darkLayer : lightLayer]
    });

    map.on('zoomend', ()=> {
        updateStationStyles();
    });

    map.addLayer(stationLayer);

    await loadStations();

    return { map, lightLayer, darkLayer };
}

async function loadStations() {
    const res = await fetch('data/station_list.csv');
    const text = await res.text();
    const rows = text.trim().split('\n').slice(1);
    rows.forEach(row => {
      const [id, name, lat, lng] = row.split(',');
      const marker = createStationMarker([parseFloat(lat), parseFloat(lng)]);
      stationLayer.addLayer(marker);
      stationMarkers.push(marker);
    });
    updateStationStyles();
}

function createStationMarker(latlng) {
    return L.circleMarker(latlng, {
      radius: 6,
      color: getOutlineColor(),
      weight: 1,
      opacity: 0.6,
      fillColor: '#4FC3F7',
      fillOpacity: getAlphaForZoom(),
      opacity: getAlphaForZoom(),
    });
}

function getAlphaForZoom() {
    const zoom = map.getZoom();
    const clampedZoom = Math.max(11, Math.min(15, zoom));
    const alpha = 0.15 + ((clampedZoom - 11) / (15 - 11)) * (0.75 - 0.15); // linear interpolation
    return alpha;
}

// Apply styles to markers based on zoom level
function updateStationStyles() {
  const zoom = map.getZoom();
  const { radius, fillOpacity } = getMarkerStyle(zoom);

  stationLayer.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
          layer.setStyle({ radius, fillOpacity });
      }
  });
}

function getRadiusForZoom() {
    const zoom = map.getZoom();
    return Math.max(3, Math.min(10, 6 + (zoom - 13)));
}

function getOutlineColor() {
    const dark = document.getElementById('chkDarkTheme').checked;
    return dark ? 'white' : 'black';
}

function getFillColor() {
    return document.getElementById('chkDarkTheme').checked ? '#4FC3F7' : '#0080ff';
}

function updateStationOutlines(dark) {
    stationLayer.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
            layer.setStyle({
            color: dark ? 'white' : 'black',
            opacity: 0.6,
            });
        }
    });
}

export function switchMapTheme() {
    stationMarkers.forEach(marker => {
        marker.setStyle({
            color: getOutlineColor(),
            fillColor: getFillColor(),
            fillOpacity: getAlphaForZoom()
        })
    });

    if (chkDarkTheme.checked) {
      // Dark theme
      if (map.hasLayer(lightLayer)) {
        map.removeLayer(lightLayer);
      }
      map.addLayer(darkLayer);
    } else {
      // Light theme
      if (map.hasLayer(darkLayer)) {
        map.removeLayer(darkLayer);
      }
      map.addLayer(lightLayer);
    }
  }

// Calculate radius and opacity based on zoom
function getCircleStyle(zoom) {
    const radius = Math.max(2, Math.min(10, zoom)); // radius between 2 and 10
    const opacity = Math.min(1, 0.2 + zoom * 0.08);  // opacity grows with zoom
    return {
      radius,
      color: '#00bfff',
      fillColor: '#00bfff',
      fillOpacity: opacity,
      weight: 1
    };
}

// Reusable function to calculate dynamic styles for markers
function getMarkerStyle(zoom) {
  const alpha = Math.max(0.15, Math.min(0.75, 0.15 + (zoom - 11) / 4 * (0.75 - 0.15)));
  const radius = Math.max(3, Math.min(10, 6 + (zoom - 13)));
  return { radius, fillOpacity: alpha };
}