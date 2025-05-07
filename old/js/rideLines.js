import { stationCoords } from './stationManager.js';
import { getCheckedRideDirections } from './optionsPanel.js';

let rideLineLayer = null;
const canvasRenderer = L.canvas();

export function initializeRideLines(mapInstance) {
  rideLineLayer = L.layerGroup().addTo(mapInstance);
}

export function destroyRideLines() {
  rideLineLayer.clearLayers();
}

export function drawRideLines(rideData) {
  if( !rideLineLayer ) { console.warn('rideLineLayer not initialized.'); return; }

  const shownDirections = getCheckedRideDirections();

  rideLineLayer.clearLayers();

  console.log("Show Inbound: ", shownDirections[1]);
  console.log("Show Outbound: ", shownDirections[0]);

  const seenPairs = new Set();

  rideData.rides.forEach( ride => {
    const startId = ride.start_station_id;
    const endId = ride.end_station_id;

    if( startId === endId ) { return; }
    const dir = ride.direction;

    if( !shownDirections[dir] ) { return; }

    const pairKey = `${startId}-${endId}`;
    if( seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);

    const startCoords = stationCoords.get(startId);
    const endCoords = stationCoords.get(endId);

    if( !startCoords || !endCoords ) { return; }

    const color = dir === "0" ? "red" : "green";

    rideLineLayer.addLayer(L.polyline(
      [startCoords, endCoords], {
        color,
        weight: 4,
        opacity: 0.3,
        renderer: canvasRenderer
      }
    ));
  });
}
