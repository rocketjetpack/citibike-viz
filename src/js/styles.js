// Get current theme
function isDarkTheme() {
  return document.body.classList.contains('dark-theme');
}

export function getDefaultStationStyle() {
  const dark = isDarkTheme();
  return {
    radius: 6,
    fillColor: dark ? '#5bc0de' : '#0074D9',  // light blue / dark blue
    color: dark ? '#ffffff' : '#000000',      // white / black border
    weight: 1,
    opacity: 1,
    fillOpacity: 0.5
  };
}

export function getSelectedStationStyle() {
  const dark = isDarkTheme();
  return {
    radius: 8,
    fillColor: '#800080',                    // purple
    color: dark ? '#ffffff' : '#000000',     // white / black border
    weight: 2,
    opacity: 1,
    fillOpacity: 0.7
  };
}

export function getStationStyle(isSelected, isDarkTheme, zoom) {
  const fillAlpha = getInterpolatedAlpha(zoom, 11, 15, 0.5, 0.25);
  const outlineAlpha = getInterpolatedStrokeAlpha(zoom, 11, 15, 0.3, 0.55);

  if (isSelected) {
    return {
      radius: 8,
      fillColor: 'rgba(128, 0, 128, 0.8)',
      color: isDarkTheme ? `rgba(255,255,255,0.85)` : `rgba(0,0,0,0.85)`,
      weight: 2,
      fillOpacity: fillAlpha
    };
  } else {
    const fillColor = isDarkTheme
      ? `rgba(173, 216, 230, ${fillAlpha})`
      : `rgba(0, 0, 139, ${fillAlpha})`; // lightblue/darkblue
    const outlineColor = isDarkTheme
      ? `rgba(255,255,255,${outlineAlpha})`
      : `rgba(0,0,0,${outlineAlpha})`;

    return {
      radius: 6,
      fillColor,
      color: outlineColor,
      weight: 1,
      fillOpacity: fillAlpha
    };
  }
}

function getInterpolatedStrokeAlpha(zoom) {
  // Customize min/max zoom and alpha range as needed
  const minZoom = 11;
  const maxZoom = 17;
  const minAlpha = 0.1;
  const maxAlpha = 0.8;

  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
  const t = (clampedZoom - minZoom) / (maxZoom - minZoom);
  return minAlpha + t * (maxAlpha - minAlpha);
}


export function getInterpolatedAlpha(zoom, zoomMin, zoomMax, alphaMin, alphaMax) {
  const clampedZoom = Math.min(Math.max(zoom, zoomMin), zoomMax);
  const t = (clampedZoom - zoomMin) / (zoomMax - zoomMin);
  return alphaMax - t * (alphaMax - alphaMin);
}