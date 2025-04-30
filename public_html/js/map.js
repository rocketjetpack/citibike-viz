const map = L.map("map").setView([40.73, -73.95], 13);

const lightTiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
});

const darkTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap, &copy; CartoDB",
});

lightTiles.addTo(map);

function switchBasemap(theme) {
  if (theme === "dark") {
    map.removeLayer(lightTiles);
    darkTiles.addTo(map);
  } else {
    map.removeLayer(darkTiles);
    lightTiles.addTo(map);
  }
}

const stationIcon = L.icon({
  iconUrl: "assets/bike_icon.webp",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const stationLayer = L.layerGroup().addTo(map);
const stationById = {};

function loadStations() {
  fetch("data/station_list.csv")
    .then((res) => res.text())
    .then((text) => {
      const rows = Papa.parse(text, { header: true }).data;

      for (const row of rows) {
        const lat = parseFloat(row.station_lat);
        const lng = parseFloat(row.station_lng);
        const id = row.station_id;

        stationById[id] = {
          name: row.station_name,
          lat,
          lng,
        };

        const marker = L.circleMarker([lat, lng], {
          radius: 5,
          fillColor: "#00bcd4",
          color: "#fff",
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.5,
        })
          .addTo(stationLayer)
          .bindTooltip(row.station_name);

        // Add click event to the marker
        marker.on("click", () => {
          selectStation(id);
        });
      }
    });
}

loadStations();

let selectedStation = null;
let selectedMarker = null;
const stationMarkers = {};

function selectStation(stationId) {
  const station = stationById[stationId];

  if (!station) return;

  // Log the selected station's information to the console
  console.log(`Station selected: ${station.name} (ID: ${stationId})`);
  console.log(`Latitude: ${station.lat.toFixed(6)}, Longitude: ${station.lng.toFixed(6)}`);

  // Reset the previously selected station marker (if any)
  if (selectedMarker) {
    // Reset the style of the previously selected marker to default size
    selectedMarker.setStyle({
      fillColor: "#00bcd4", // Default color for unselected stations
      color: "#fff",
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.5,
      radius: 5,  // Reset size to default
    });
  }

  // Update the selected station and marker
  selectedStation = stationId;

  // Populate the station details in the UI
  document.getElementById("stationName").textContent = station.name;
  document.getElementById("stationLatLng").textContent = `${station.lat.toFixed(6)}, ${station.lng.toFixed(6)}`;
  document.getElementById("rideCount").textContent = "Loading..."; // You can update this with actual ride data later

  // Check if we already have the marker for the station
  if (!stationMarkers[stationId]) {
    // Create a new marker for the selected station
    stationMarkers[stationId] = L.circleMarker([station.lat, station.lng], {
      radius: 5,  // Default size
      fillColor: "#00bcd4",
      color: "#fff",
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.5,
    }).addTo(map);

    // Add the click event listener for station selection
    stationMarkers[stationId].on('click', () => selectStation(stationId));
  }

  // Apply the highlight style to the newly selected station
  selectedMarker = stationMarkers[stationId];
  selectedMarker.setStyle({
    radius: 7,  // Highlight size for the selected station
    fillColor: "#ff0000", // Highlight color for the selected station
    color: "#fff",
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.6,
  });

  // Bind the tooltip (you can add additional content here as needed)
  selectedMarker.bindTooltip(station.name).openTooltip();
}

// --- Top 50 routes logic ---
let topRoutesLayer = null;

async function toggleTopRoutes(show) {
  if (topRoutesLayer) {
    map.removeLayer(topRoutesLayer);
    topRoutesLayer = null;
  }

  if (!show) return;

  const month = parseInt(document.getElementById("monthSlider").value);
  const monthStr = month.toString().padStart(2, "0");
  const url = `data/top50/2024-${monthStr}-top-50.json`;

  try {
    const response = await fetch(url);
    const routes = await response.json();

    const polylines = [];
    const fixedLineWeight = 2;

    for (const route of routes) {
      const start = stationById[route.start_station_id];
      const end = stationById[route.end_station_id];

      if (!start || !end) continue;

      const line = L.polyline([[start.lat, start.lng], [end.lat, end.lng]], {
        color: "#ff9900",
        weight: fixedLineWeight,
        opacity: 0.85,
      });

      line.bindTooltip(`${route.count} rides`, { permanent: false });
      polylines.push(line);
    }

    topRoutesLayer = L.layerGroup(polylines);
    topRoutesLayer.addTo(map);
  } catch (err) {
    console.error("Failed to load top 50 routes:", err);
  }
}
