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
const markerById = {};
let selectedStationId = null;
let selectedMarker = null;
let hourlyChart = null;

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

        marker.on("click", () => selectStation(id));

        markerById[id] = marker;
      }
    });
}

function selectStation(stationId) {
  console.log("Selected station:", stationId);
  if (selectedMarker) {
    selectedMarker.setStyle({ radius: 5 });
  }

  selectedStationId = stationId;
  selectedMarker = markerById[stationId];
  selectedMarker.setStyle({ radius: 8 });

  const station = stationById[stationId];
  document.getElementById("stationName").textContent = station.name;
  document.getElementById("stationLatLng").textContent = `${station.lat.toFixed(5)}, ${station.lng.toFixed(5)}`;

  // Store the station ID in the hidden input field
  document.getElementById("selectedStationId").value = stationId;

  // Load the data for the selected station and current month
  updateStationData();
}

function updateStationData() {
  const selectedStationId = document.getElementById("selectedStationId").value;
  if (!selectedStationId) return;

  const month = parseInt(document.getElementById("monthSlider").value);
  const monthStr = month.toString().padStart(2, "0");
  const prefix = selectedStationId.slice(0, 2);
  const url = `data/stations/${prefix}/${selectedStationId}/2024-${monthStr}-ridedata.json`;

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Data not found");
      return res.json();
    })
    .then((data) => {
      const count = data?.summary?.total_inbound + data?.summary?.total_outbound;
      document.getElementById("rideCount").textContent = count || 0;

      if (Array.isArray(data.rides)) {
        updateHourlyChart(data.rides);
      } else {
        updateHourlyChart([]);
      }
    })
    .catch((err) => {
      console.warn("No data for station/month:", err);
      document.getElementById("rideCount").textContent = "--";
      updateHourlyChart([]);
    });
}

function updateHourlyChart(rides) {
  console.log("updateHourlyChart() called with data: ", rides);
  const inbound = new Array(24).fill(0);
  const outbound = new Array(24).fill(0);

  for (const ride of rides) {
    const hour = new Date(ride.started_at.replace(" ", "T")).getHours();
    if (Number(ride.direction) === 1) {
      inbound[hour]++;
    } else if (Number(ride.direction) === 0) {
      outbound[hour]++;
    }
  }

  const ctx = document.getElementById("hourlyChart").getContext("2d");

  if (hourlyChart) {
    hourlyChart.destroy();
  }

  hourlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [...Array(24).keys()].map(h => `${h}:00`),
      datasets: [
        {
          label: "Inbound",
          data: inbound,
          backgroundColor: "#4caf50",
        },
        {
          label: "Outbound",
          data: outbound.map(v => -v),
          backgroundColor: "#f44336",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          stacked: true,
        },
        x: {
          stacked: true,
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || "";
              const value = Math.abs(context.raw);
              return `${label}: ${value}`;
            },
          },
        },
      },
    },
  });
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

    for (const route of routes) {
      const start = stationById[route.start_station_id];
      const end = stationById[route.end_station_id];

      if (!start || !end) continue;

      const line = L.polyline([[start.lat, start.lng], [end.lat, end.lng]], {
        color: "#ff9900",
        weight: 2,
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

loadStations();
