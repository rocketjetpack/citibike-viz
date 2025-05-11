import { stationCoords, getStationNameById } from './stationManager.js';
import { getCheckedRideDirections, getCheckedShowOneRouteRides } from './optionsPanel.js';

let rideLineLayer = null;
const canvasRenderer = L.canvas();
const animations = [];

export function initializeRideLines(mapInstance) {
  rideLineLayer = L.layerGroup().addTo(mapInstance);
}

export function destroyRideLines() {
  rideLineLayer.clearLayers();
  animations.forEach(animation => clearInterval(animation));
}

function calculateRideLinesToDraw(rides) {
  const shownDirections = getCheckedRideDirections();
  const pairCounts = new Map();

  // Count rides between pairs
  for (const ride of rides) {
    const startId = ride.start_station_id;
    const endId = ride.end_station_id;
    const dir = ride.direction;

    if (startId === endId || !shownDirections[dir]) continue;

    const pairKey = `${startId}-${endId}-${dir}`;
    pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
  }

  const lines = [];

  for (const [pairKey, count] of pairCounts.entries()) {
    const [startId, endId, dir] = pairKey.split('-');
    const startData = stationCoords.get(startId);
    const endData = stationCoords.get(endId);
    if (!startData || !endData) continue;

    const startCoords = startData.coords;
    const endCoords = endData.coords;

    const color = dir === "0" ? "red" : "green"; // red for outbound (0), green for inbound (1)
    const label = `${getStationNameById(startId)} → ${getStationNameById(endId)} (${count} ride${count > 1 ? 's' : ''})`;

    if( !getCheckedShowOneRouteRides() && count == 1 ) { 
      continue; 
    } else {
      lines.push({ startCoords, endCoords, color, label, count, dir });
    }
  }

  // Sort the lines by ride count (descending order)
  lines.sort((a, b) => b.count - a.count);

  // Check if the "Show Top 50" checkbox is checked
  if (document.getElementById('chkShowTop50').checked) {
    // Return only the top 50 rides by count
    return lines.slice(0, 50);
  }

  console.info("calculateRideLinesToDraw() returning ", lines.length, " lines to draw.");
  return lines;
}


let lastFrameTime = 0;  // Timestamp of the last frame update
const frameDelay = 1000 / 60;  // Frame delay for 60 FPS

export function drawRideLines(rideData) {
  if (!rideLineLayer) {
    console.warn('rideLineLayer not initialized.');
    return;
  }

  rideLineLayer.clearLayers();

  const linesToDraw = calculateRideLinesToDraw(rideData.rides);

  let i = 0; // For varying curve direction

  const maxCount = 100; // Set the max count for alpha scaling
  const minAlpha = 0.2; // Minimum opacity for lines
  const maxAlpha = 0.6; // Maximum opacity for lines

  for (const { startCoords, endCoords, color, label, count, dir } of linesToDraw) {
    const curvePoints = getSmoothCurvedLine(startCoords, endCoords, dir, i++);

    const alpha = minAlpha + ((count - 1) / maxCount) * (maxAlpha - minAlpha);

    const polyline = L.polyline(curvePoints, {
      color,
      weight: 3,
      opacity: alpha,
      renderer: canvasRenderer
    }).bindTooltip(label, { permanent: false });

    rideLineLayer.addLayer(polyline);

    // Calculate the line length (in meters)
    const lineLength = L.GeometryUtil.length(polyline.getLatLngs());

    // Adaptive number of arrowheads based on ride count and line length
    const baseArrowheads = Math.floor(count / 10);  // 1 arrowhead per 10 rides
    const arrowCount = Math.min(baseArrowheads == 0 ? 1 : baseArrowheads, 10); // Cap number of arrowheads at 10 per route
    
    // Calculate the percentage step for arrowhead offset, relative to line length
    const offsetStep = lineLength / arrowCount;

    const patterns = [];
    const arrowOffsets = []; // To track the offset of each arrowhead

    for (let j = 1; j <= arrowCount; j++) {
      const offsetDistance = offsetStep * j; // Proportional distance along the line
      const offsetPct = offsetDistance / lineLength; // Percentage of the total line length

      arrowOffsets.push(offsetPct * 100); // Track the initial offset for each arrowhead

      patterns.push({
        offset: `${arrowOffsets[j - 1]}%`,
        symbol: L.Symbol.arrowHead({
          pixelSize: 6,
          polygon: false,
          pathOptions: {
            stroke: true,
            color,
            opacity: alpha
          }
        })
      });
    }

    const decorator = L.polylineDecorator(polyline, { patterns });
    rideLineLayer.addLayer(decorator);

    // Start the animation of arrowheads along the curve
    animateArrowheads(decorator, polyline, arrowOffsets, arrowCount, lineLength, color, alpha);
  }
}

function animateArrowheads(decorator, polyline, arrowOffsets, arrowCount, lineLength, color, alpha) {
  let lastUpdateTime = 0;  // Track last update time for throttling

  function moveArrowheads(timestamp) {
    // Throttle the animation to 60 FPS
    if (timestamp - lastUpdateTime < frameDelay) {
      requestAnimationFrame(moveArrowheads);
      return;
    }

    lastUpdateTime = timestamp;

    // Loop over each arrowhead
    for (let i = 0; i < arrowCount; i++) {
      // Update the offset for each arrowhead
      arrowOffsets[i] += 0.01 * 100; // Increase the offset percentage

      // When an arrowhead reaches the end of the line (100%), reset it to 0%
      if (arrowOffsets[i] >= 100) {
        arrowOffsets[i] = 0;  // Reset offset to 0
      }
    }

    const patterns = [];
    const offsetStep = lineLength / arrowCount;
    for (let j = 0; j < arrowCount; j++) {
      const offsetPct = (arrowOffsets[j] + (offsetStep * j) / lineLength) % 100; // Ensure the offset is within 0-100%

      patterns.push({
        offset: `${offsetPct}%`,
        symbol: L.Symbol.arrowHead({
          pixelSize: 6,
          polygon: false,
          pathOptions: {
            stroke: true,
            color,
            opacity: alpha
          }
        })
      });
    }

    // Update the arrowhead positions (batch update)
    decorator.setPatterns(patterns);

    // Request the next frame for smooth animation
    requestAnimationFrame(moveArrowheads);
  }

  // Start the animation loop
  requestAnimationFrame(moveArrowheads);
}


function getSmoothCurvedLine(start, end, direction, directionOffsetIndex = 0) {
  const lat1 = start[0], lng1 = start[1];
  const lat2 = end[0], lng2 = end[1];

  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Base offset is proportional to distance
  const baseOffset = dist * 1;

  // Mirror curve direction based on ride direction (0 = outbound, 1 = inbound)
  const directionFactor = direction === "0" ? 1 : -1; // Outbound: 1, Inbound: -1

  // Alternate bending direction (+/-) based on ride direction
  const directionSign = direction === "0" ? 1 : -1;  // Outbound: +, Inbound: -

  // Rotate perpendicular to the line direction
  const controlLat = (lat1 + lat2) / 2 + directionSign * dx * baseOffset;
  const controlLng = (lng1 + lng2) / 2 - directionSign * dy * baseOffset;

  const segments = 40;
  const curvePoints = [];

  for (let t = 0; t <= 1; t += 1 / segments) {
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * controlLng + t * t * lng2;
    curvePoints.push([lat, lng]);
  }

  // Ensure exact start/end
  curvePoints[0] = start;
  curvePoints[curvePoints.length - 1] = end;

  return curvePoints;
}
