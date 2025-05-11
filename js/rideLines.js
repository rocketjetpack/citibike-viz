import { stationCoords, getStationNameById } from './stationManager.js';
import { getCheckedRideDirections, getCheckedShowOneRouteRides } from './optionsPanel.js';

let rideLineLayer = null;
const canvasRenderer = L.canvas();
const animations = [];
const globalLineCountLimit = 500;

export function initializeRideLines(mapInstance) {
  rideLineLayer = L.layerGroup().addTo(mapInstance);
}

export function destroyRideLines() {
  rideLineLayer.clearLayers();
  animations.forEach(animation => {
    cancelAnimationFrame(animation);
  });
  animations.length = 0;  // Clear the animations array
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
  const lineCountLimit = document.getElementById('chkShowTop100').checked ? 100 : globalLineCountLimit;


  return lines.slice(0, lineCountLimit);
}

let lastFrameTime = 0;  // Timestamp of the last frame update
const frameDelay = 1000 / 60;  // Frame delay for 60 FPS

const arrowSpeedLimit = 0.025;  // Speed limit for the arrowhead (adjust this value to control speed)

export function drawRideLines(rideData) {
  if (!rideLineLayer) {
    console.warn('rideLineLayer not initialized.');
    return;
  }

  rideLineLayer.clearLayers();

  const linesToDraw = calculateRideLinesToDraw(rideData.rides);
  console.log("Retrieved ", linesToDraw.length, " lines to draw.");

  let i = 0; // For varying curve direction

  const maxCount = 100; // Set the max count for alpha scaling
  const minAlpha = 0.2; // Minimum opacity for lines
  const maxAlpha = 0.6; // Maximum opacity for lines

  // Store references to decorators
  const decorators = [];

  // Calculate all the lines and their arrow patterns in advance
  for (const { startCoords, endCoords, color, label, count, dir } of linesToDraw) {
    const curvePoints = getSmoothCurvedLine(startCoords, endCoords, dir, i++);

    const alpha = minAlpha + ((count - 1) / maxCount) * (maxAlpha - minAlpha);

    const polyline = L.polyline(curvePoints, {
      color,
      weight: 3,
      opacity: alpha,
      renderer: canvasRenderer
    }).bindTooltip(label, { permanent: false, interactive: true });

    rideLineLayer.addLayer(polyline);

    // Calculate the line length (in meters)
    const lineLength = L.GeometryUtil.length(polyline.getLatLngs());

    // Adaptive number of arrowheads based on ride count and line length
    const baseArrowheads = Math.floor(count / 10);  // 1 arrowhead per 10 rides
    const arrowCount = Math.min(baseArrowheads == 0 ? 2 : baseArrowheads, 10); // Cap number of arrowheads at 10 per route
    
    // Calculate the percentage step for arrowhead offset, relative to line length
    const offsetStep = lineLength / arrowCount;

    const patterns = [];
    const arrowOffsets = []; // To track the offset of each arrowhead
    let offsetPct = 0;    

    for (let j = 1; j <= arrowCount; j++) {
      const offsetDistance = offsetStep * j; // Proportional distance along the line
      offsetPct = offsetDistance / lineLength; // Percentage of the total line length

      arrowOffsets.push(offsetPct * 100); // Track the initial offset for each arrowhead

      patterns.push({
        offset: `${arrowOffsets[j - 1]}%`,
        symbol: L.Symbol.arrowHead({
          pixelSize: 6,
          polygon: false,
          pathOptions: {
            stroke: true,
            color,
            opacity: alpha,
            pointerEvents: 'none'
          }
        })
      });
    }

    // Add the decorator (for visualizing the arrowhead pattern)
    const decorator = L.polylineDecorator(polyline, { patterns });
    rideLineLayer.addLayer(decorator);

    // Store the decorator and the offsets for animation
    decorators.push({ decorator, polyline, arrowOffsets, arrowCount, lineLength, color, alpha });
  }

  // Start animating the arrowheads
  animateArrowheads(decorators);
}

function animateArrowheads(decorators) {
  let lastUpdateTime = 0;  // Track last update time for throttling

  function moveArrowheads(timestamp) {
    // Throttle the animation to 60 FPS
    if (timestamp - lastUpdateTime < frameDelay) {
      requestAnimationFrame(moveArrowheads);
      return;
    }

    lastUpdateTime = timestamp;

    // Loop over each route
    decorators.forEach(({ decorator, arrowOffsets, arrowCount, lineLength, color, alpha }) => {
      const offsetStep = lineLength / arrowCount;

      const patterns = [];
      for (let i = 0; i < arrowCount; i++) {
        // If no start offset is defined, randomize it
        if (arrowOffsets[i] === undefined) {
          arrowOffsets[i] = Math.random() * 100; // Randomize the start position of each arrowhead
        }

        // Calculate the speed as a fraction of the line length
        //const distancePerFrame = 1/(lineLength/1000) * arrowSpeedLimit;// * lineLength;  // Total movement per frame based on line length
        
        const distancePerFrame = lineLength * arrowSpeedLimit > 50 ? 50 : lineLength * arrowSpeedLimit;
        

        // For a single arrowhead, calculate the movement based on the line length
        if (arrowCount === 1) {
          arrowOffsets[i] += (distancePerFrame / 100);  // Increment by the distance for the current frame

          // Reset offset when the arrowhead reaches the end
          if (arrowOffsets[i] >= 100) {
            arrowOffsets[i] = 0; // Reset to 0% at the end of the line
          }
        } else {
          // For multiple arrowheads, just adjust the offset based on a fixed increment
          arrowOffsets[i] += (distancePerFrame / 100);  // Same as above, adjusted by line length

          if (arrowOffsets[i] >= 100) {
            arrowOffsets[i] = 0;  // Reset offset to 0 if it goes past the end
          }
        }

        // Calculate the new pattern offsets
        const offsetPct = (arrowOffsets[i] + (offsetStep * i) / lineLength) % 100; // Ensure the offset is within 0-100%

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
    });

    // Request the next frame for smooth animation
    requestAnimationFrame(moveArrowheads);
  }

  // Start the animation loop
  const animationId = requestAnimationFrame(moveArrowheads);
  animations.push(animationId); // Store the animation ID for stopping later
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
