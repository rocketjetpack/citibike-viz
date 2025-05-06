import { stationCoords } from './stationManager.js';

let rideLineLayer = null;
const canvasRenderer = L.canvas();

export function initializeRideLines(mapInstance) {
  rideLineLayer = L.layerGroup().addTo(mapInstance);
}

export function destroyRideLines() {
  rideLineLayer.clearLayers();
}

export function drawRideLines(rideData) {
  if (!rideLineLayer) {
    console.warn('Ride line layer not initialized.');
    return;
  }

  rideLineLayer.clearLayers();

  const seenPairs = new Set();

  rideData.rides.forEach(ride => {
    const startId = ride.start_station_id;
    const endId = ride.end_station_id;
    const dir = ride.direction;

    const pairKey = `${startId}-${endId}`;
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);

    const startCoords = stationCoords.get(startId);
    const endCoords = stationCoords.get(endId);

    if (!startCoords || !endCoords) return;

    const latlngs = dir === "0"
      ? [startCoords, endCoords]
      : [endCoords, startCoords];

    const color = dir === "0" ? 'red' : 'green';

    const line = L.polyline(latlngs, {
      color,
      weight: 4,
      opacity: 0.4,
      renderer: canvasRenderer
    });

    rideLineLayer.addLayer(line);
  });
}
