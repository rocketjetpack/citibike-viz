import { createMap } from './map.js';
import { setupEventListeners } from './events.js';
import { initializeOptionsPanel } from './optionsPanel.js';
import { initializeStationPanel } from './stationPanel.js';

// Create and export map + tile layers so events.js can access them


// Setup UI and theme toggle event listeners]

export const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

export function initialize() {
  // Initialize options panel and station panel
  initializeOptionsPanel();
  initializeStationPanel();

  const chkDarkTheme = document.getElementById('chkDarkTheme');
  if (chkDarkTheme.checked) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }

  // Additional initialization logic can go here
  const { map, lightLayer, darkLayer } = createMap();
  setupEventListeners({ map, lightLayer, darkLayer });
}

// Call the initialize function when the page is ready
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  const stationInfoPanel = document.getElementById('stationPanel');
  console.log(stationInfoPanel.getBoundingClientRect());  
});
